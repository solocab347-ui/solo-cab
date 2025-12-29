import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_id: string;
  title: string;
  message: string;
  link?: string;
  tag?: string;
}

// Fonction pour encoder en base64url
function base64urlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Fonction pour décoder base64url
function base64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Créer le JWT pour VAPID
async function createVapidJwt(audience: string, subject: string, privateKeyBase64: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 heures
    sub: subject
  };

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Importer la clé privée
  const privateKeyBytes = base64urlDecode(privateKeyBase64);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Signer
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convertir la signature en format JWT
  const signatureB64 = base64urlEncode(new Uint8Array(signature));

  return `${unsignedToken}.${signatureB64}`;
}

// Envoyer une notification push via Web Push Protocol
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; message: string; link?: string; tag?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const endpoint = new URL(subscription.endpoint);
    const audience = `${endpoint.protocol}//${endpoint.host}`;

    // Créer le payload de la notification
    const notificationPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      body: payload.message,
      link: payload.link || '/',
      tag: payload.tag || 'solocab-notification',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png'
    });

    // Pour une implémentation simplifiée, on envoie directement
    // Note: Une implémentation complète nécessiterait l'encryption ECE
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Authorization': `vapid t=${await createVapidJwt(audience, 'mailto:contact@solocab.fr', vapidPrivateKey)}, k=${vapidPublicKey}`,
        'Content-Encoding': 'aes128gcm'
      },
      body: notificationPayload
    });

    if (response.ok || response.status === 201) {
      console.log('Push envoyé avec succès à:', subscription.endpoint.substring(0, 50));
      return true;
    } else {
      console.error('Erreur push:', response.status, await response.text());
      return false;
    }
  } catch (error) {
    console.error('Erreur envoi push:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('VAPID keys not configured, falling back to DB notification only');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    console.log('📬 Sending push notification to user:', payload.user_id);
    console.log('📬 Title:', payload.title);

    // Récupérer les subscriptions actives de l'utilisateur
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', payload.user_id)
      .eq('is_active', true);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    let pushSentCount = 0;
    let pushFailedCount = 0;

    // Envoyer les vraies notifications push si VAPID est configuré
    if (vapidPublicKey && vapidPrivateKey && subscriptions && subscriptions.length > 0) {
      console.log(`📬 Found ${subscriptions.length} active subscriptions`);

      for (const sub of subscriptions) {
        if (sub.subscription && sub.subscription.endpoint && sub.subscription.keys) {
          const success = await sendWebPush(
            sub.subscription,
            payload,
            vapidPublicKey,
            vapidPrivateKey
          );

          if (success) {
            pushSentCount++;
          } else {
            pushFailedCount++;
            // Marquer la subscription comme inactive si elle échoue
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }
        }
      }

      console.log(`📬 Push sent: ${pushSentCount}, failed: ${pushFailedCount}`);
    } else {
      console.log('📬 No valid subscriptions or VAPID not configured');
    }

    // Toujours créer une notification dans la DB pour le realtime
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.user_id,
        title: payload.title,
        message: payload.message,
        link: payload.link || '/notifications',
        type: 'push',
        is_read: false
      });

    if (notifError) {
      console.error('Error creating notification:', notifError);
      // Ne pas throw, la notification push a peut-être fonctionné
    }

    console.log('✅ Push notification process completed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification sent',
        push_sent: pushSentCount,
        push_failed: pushFailedCount,
        subscriptions_count: subscriptions?.length || 0,
        db_notification: !notifError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
