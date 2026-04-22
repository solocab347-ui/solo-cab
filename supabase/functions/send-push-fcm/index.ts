/**
 * Edge function: send-push-fcm
 * Envoie une notification push haute priorité aux appareils mobiles d'un utilisateur
 * - Android via FCM HTTP v1 (OAuth2 signé avec service account JSON)
 * - iOS via APNS HTTP/2 (JWT signé avec p8)
 *
 * Mode dégradé : si FCM_SERVICE_ACCOUNT_JSON ou APNS keys absents, la fonction continue
 * sans fail (le realtime Supabase prend le relais).
 *
 * Body :
 * {
 *   user_ids: string[],
 *   title: string,
 *   body: string,
 *   type?: 'incoming_ride' | 'message' | 'generic',
 *   data?: Record<string, string>
 * }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_ids: string[];
  title: string;
  body: string;
  type?: string;
  data?: Record<string, string>;
}

// =============================================================
// Helpers — PEM (PKCS#8) → CryptoKey
// =============================================================
function pemToBinary(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

// =============================================================
// FCM HTTP v1 — OAuth2 access token via service account JSON
// =============================================================
interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri: string;
}

async function getFcmAccessToken(sa: ServiceAccount): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const jwt = await create(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: sa.token_uri,
      iat: getNumericDate(0),
      exp: getNumericDate(60 * 60),
    },
    cryptoKey
  );

  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`OAuth2 token error: ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
}

async function sendFcmV1(
  token: string,
  payload: PushPayload,
  accessToken: string,
  projectId: string
): Promise<boolean> {
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const message = {
    message: {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      android: {
        priority: 'HIGH' as const,
        notification: {
          sound: 'ride_alert',
          channel_id: 'solocab_rides',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      data: {
        type: payload.type || 'generic',
        full_screen: payload.type === 'incoming_ride' ? 'true' : 'false',
        ...(payload.data || {}),
      },
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  if (!res.ok) {
    console.error('[FCM v1] error', await res.text());
    return false;
  }
  return true;
}

// =============================================================
// APNS — JWT signé p8 (Apple Push Notification service HTTP/2)
// =============================================================
async function buildApnsJwt(): Promise<string | null> {
  const keyP8 = Deno.env.get('APNS_KEY_P8');
  const keyId = Deno.env.get('APNS_KEY_ID');
  const teamId = Deno.env.get('APNS_TEAM_ID');
  if (!keyP8 || !keyId || !teamId) return null;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(keyP8),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  return await create(
    { alg: 'ES256', kid: keyId, typ: 'JWT' },
    { iss: teamId, iat: getNumericDate(0) },
    cryptoKey
  );
}

async function sendApns(token: string, payload: PushPayload, jwt: string, bundleId: string) {
  const url = `https://api.push.apple.com/3/device/${token}`;
  const body = {
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: 'ride_alert.wav',
      'mutable-content': 1,
      'content-available': 1,
      category: payload.type || 'GENERIC',
    },
    type: payload.type || 'generic',
    ...(payload.data || {}),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${jwt}`,
      'apns-topic': bundleId,
      'apns-priority': '10',
      'apns-push-type': 'alert',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const FCM_SA_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
    const APNS_BUNDLE = Deno.env.get('APNS_BUNDLE_ID') || 'app.lovable.bb7de2decc6d441aa3800f8d244f90e4';

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const payload: PushPayload = await req.json();

    if (!Array.isArray(payload.user_ids) || payload.user_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'user_ids required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token, platform, user_id')
      .in('user_id', payload.user_ids)
      .eq('is_active', true);

    if (error) {
      console.error('[send-push-fcm] DB error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const androidTokens = (tokens ?? []).filter((t) => t.platform === 'android').map((t) => t.token);
    const iosTokens = (tokens ?? []).filter((t) => t.platform === 'ios').map((t) => t.token);

    let sentAndroid = 0;
    let sentIos = 0;
    const modes: string[] = [];

    // ============= FCM HTTP v1 (Android) =============
    if (FCM_SA_JSON && androidTokens.length > 0) {
      try {
        const sa: ServiceAccount = JSON.parse(FCM_SA_JSON);
        const accessToken = await getFcmAccessToken(sa);
        modes.push('fcm-v1');
        const results = await Promise.all(
          androidTokens.map((t) => sendFcmV1(t, payload, accessToken, sa.project_id).catch(() => false))
        );
        sentAndroid = results.filter(Boolean).length;
      } catch (err) {
        console.error('[FCM v1] fatal', err);
      }
    }

    // ============= APNS (iOS) =============
    if (iosTokens.length > 0) {
      try {
        const jwt = await buildApnsJwt();
        if (jwt) {
          modes.push('apns');
          const results = await Promise.all(
            iosTokens.map((t) => sendApns(t, payload, jwt, APNS_BUNDLE).catch(() => false))
          );
          sentIos = results.filter(Boolean).length;
        } else {
          console.log('[APNS] keys absentes → skip iOS');
        }
      } catch (err) {
        console.error('[APNS] fatal', err);
      }
    }

    // Update last_used_at
    if ((tokens ?? []).length > 0) {
      await supabase
        .from('push_tokens')
        .update({ last_used_at: new Date().toISOString() })
        .in('user_id', payload.user_ids)
        .eq('is_active', true);
    }

    return new Response(
      JSON.stringify({
        success: true,
        modes: modes.length ? modes : ['fallback'],
        sent: { android: sentAndroid, ios: sentIos },
        targets: tokens?.length ?? 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[send-push-fcm] fatal', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
