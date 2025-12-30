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

// Créer le JWT pour VAPID - format raw pour les clés EC
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

  try {
    // Essayer d'importer comme clé raw (format VAPID standard)
    const privateKeyBytes = base64urlDecode(privateKeyBase64);
    
    // Si c'est 32 bytes, c'est une clé raw EC
    let privateKey;
    if (privateKeyBytes.length === 32) {
      // Format JWK pour clé raw EC
      const jwk = {
        kty: 'EC',
        crv: 'P-256',
        d: privateKeyBase64,
        x: '', // On n'a pas besoin de x pour signer
        y: ''
      };
      
      // Utiliser une approche plus simple - créer une signature placeholder
      // En production, utiliser une vraie lib web-push
      console.log('Using raw key format (32 bytes)');
    }
    
    privateKey = await crypto.subtle.importKey(
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

    // Convertir la signature en format JWT (IEEE P1363 to DER)
    const signatureBytes = new Uint8Array(signature);
    const signatureB64 = base64urlEncode(signatureBytes);

    return `${unsignedToken}.${signatureB64}`;
  } catch (error) {
    console.error('Error creating VAPID JWT:', error);
    throw error;
  }
}

// Envoyer une notification push via Web Push Protocol (simplifié sans encryption)
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; message: string; link?: string; tag?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
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

    console.log('Sending push to endpoint:', subscription.endpoint.substring(0, 80));

    // Créer le JWT VAPID
    let vapidJwt;
    try {
      vapidJwt = await createVapidJwt(audience, 'mailto:contact@solocab.fr', vapidPrivateKey);
    } catch (jwtError) {
      console.error('JWT creation failed:', jwtError);
      // Essayer sans JWT pour les endpoints qui ne le requièrent pas
      vapidJwt = null;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
      'Urgency': 'high'
    };

    if (vapidJwt) {
      headers['Authorization'] = `vapid t=${vapidJwt}, k=${vapidPublicKey}`;
    }

    // Envoyer sans encryption (certains endpoints l'acceptent)
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers,
      body: new TextEncoder().encode(notificationPayload)
    });

    console.log('Push response status:', response.status);

    if (response.ok || response.status === 201) {
      console.log('✅ Push sent successfully');
      return { success: true, statusCode: response.status };
    } else {
      const responseText = await response.text();
      console.error('❌ Push failed:', response.status, responseText);
      return { success: false, statusCode: response.status, error: responseText };
    }
  } catch (error) {
    console.error('❌ Push error:', error);
    return { success: false, error: String(error) };
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

    console.log('VAPID keys configured:', !!vapidPublicKey, !!vapidPrivateKey);

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('⚠️ VAPID keys not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    console.log('📬 Push notification request for user:', payload.user_id);
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

    console.log('📬 Found subscriptions:', subscriptions?.length || 0);

    let pushSentCount = 0;
    let pushFailedCount = 0;
    const pushResults: Array<{ endpoint: string; success: boolean; error?: string }> = [];

    // Envoyer les vraies notifications push si VAPID est configuré
    if (vapidPublicKey && vapidPrivateKey && subscriptions && subscriptions.length > 0) {
      for (const sub of subscriptions) {
        const subData = sub.subscription;
        
        console.log('Processing subscription:', sub.id, 'endpoint:', sub.endpoint?.substring(0, 50));
        
        if (subData && subData.endpoint && subData.keys) {
          const result = await sendWebPush(
            {
              endpoint: subData.endpoint,
              keys: subData.keys
            },
            payload,
            vapidPublicKey,
            vapidPrivateKey
          );

          pushResults.push({
            endpoint: subData.endpoint.substring(0, 50),
            success: result.success,
            error: result.error
          });

          if (result.success) {
            pushSentCount++;
          } else {
            pushFailedCount++;
            
            // Si 410 Gone ou 404, désactiver la subscription
            if (result.statusCode === 410 || result.statusCode === 404) {
              console.log('Disabling expired subscription:', sub.id);
              await supabase
                .from('push_subscriptions')
                .update({ is_active: false })
                .eq('id', sub.id);
            }
          }
        } else {
          console.log('Invalid subscription data for:', sub.id);
        }
      }

      console.log(`📬 Push results - sent: ${pushSentCount}, failed: ${pushFailedCount}`);
    }

    // Toujours créer une notification dans la DB pour le realtime (backup)
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
      console.error('Error creating DB notification:', notifError);
    } else {
      console.log('✅ DB notification created');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification processed',
        push_sent: pushSentCount,
        push_failed: pushFailedCount,
        subscriptions_count: subscriptions?.length || 0,
        db_notification: !notifError,
        results: pushResults
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
