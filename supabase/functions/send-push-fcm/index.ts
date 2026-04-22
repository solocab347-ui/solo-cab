/**
 * Edge function: send-push-fcm
 * Envoie une notification push haute priorité aux appareils mobiles d'un utilisateur
 * (Android via FCM, iOS via APNS) ainsi qu'aux navigateurs web (existant via web-push).
 *
 * Mode dégradé : si FCM_SERVER_KEY n'est pas configuré, la fonction logue mais ne fail pas,
 * permettant à la couche realtime (Supabase) de continuer à fonctionner comme aujourd'hui.
 *
 * Body attendu :
 * {
 *   user_ids: string[],          // utilisateurs cibles
 *   title: string,
 *   body: string,
 *   type: 'incoming_ride' | 'message' | 'generic',
 *   data?: Record<string, string>
 * }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const FCM_KEY = Deno.env.get('FCM_SERVER_KEY'); // optionnel pour l'instant

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const payload: PushPayload = await req.json();

    if (!Array.isArray(payload.user_ids) || payload.user_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'user_ids required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer tokens actifs
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
    let mode: 'live' | 'fallback' = 'fallback';

    // Mode LIVE : FCM si la clé est configurée
    if (FCM_KEY && androidTokens.length > 0) {
      mode = 'live';
      const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${FCM_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_ids: androidTokens,
          priority: 'high',
          notification: {
            title: payload.title,
            body: payload.body,
            sound: 'ride_alert',
            android_channel_id: 'solocab_rides',
          },
          data: {
            type: payload.type || 'generic',
            ...(payload.data || {}),
          },
        }),
      });
      if (fcmRes.ok) sentAndroid = androidTokens.length;
      else console.error('[FCM] error', await fcmRes.text());
    }

    // iOS via APNS : nécessite plugin natif côté Apple, à brancher quand cert disponible
    // → pour l'instant on logue simplement
    if (iosTokens.length > 0) {
      console.log(`[APNS] ${iosTokens.length} iOS tokens en attente de configuration p8`);
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
        mode,
        sent: { android: sentAndroid, ios: sentIos, web: 0 },
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
