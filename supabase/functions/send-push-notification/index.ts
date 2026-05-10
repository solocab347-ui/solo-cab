import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

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
  type?: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const rawVapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const rawVapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    const webPushEnabled = !!rawVapidPublicKey && !!rawVapidPrivateKey;
    if (!webPushEnabled) console.warn('⚠️ VAPID keys not configured — skipping web push, native FCM/APNS continues');

    // Normalize to URL-safe base64 (web-push requires no padding, no +/)
    const toUrlSafeBase64 = (s: string) =>
      s.trim().replace(/\s+/g, '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    if (webPushEnabled) {
      const vapidPublicKey = toUrlSafeBase64(rawVapidPublicKey!);
      const vapidPrivateKey = toUrlSafeBase64(rawVapidPrivateKey!);
      webpush.setVapidDetails('mailto:contact@solocab.fr', vapidPublicKey, vapidPrivateKey);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushPayload = await req.json();

    console.log('📬 Push notification for user:', payload.user_id);
    console.log('📬 Title:', payload.title);

    // Get active subscriptions
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

    if (webPushEnabled && subscriptions && subscriptions.length > 0) {
      // Build notification payload
      const notificationPayload = JSON.stringify({
        title: payload.title,
        message: payload.message,
        body: payload.message,
        link: payload.link || '/',
        tag: payload.tag || 'solocab-notification',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png'
      });

      for (const sub of subscriptions) {
        const subData = sub.subscription;

        if (!subData?.endpoint || !subData?.keys?.p256dh || !subData?.keys?.auth) {
          console.log('Invalid subscription data for:', sub.id);
          continue;
        }

        // Skip fallback subscriptions
        if (subData.endpoint.includes('fallback.solocab.fr')) {
          console.log('Skipping fallback subscription:', sub.id);
          continue;
        }

        try {
          console.log('Sending push to:', subData.endpoint.substring(0, 80));

          await supabase.from('push_delivery_logs').insert({
            user_id: payload.user_id,
            channel: 'web',
            notification_type: payload.tag || 'generic',
            title: payload.title,
            body: payload.message,
            token_preview: subData.endpoint.substring(0, 24) + '…',
            success: true,
            metadata: { endpoint_host: new URL(subData.endpoint).host },
          }).then(() => {}, () => {});

          await webpush.sendNotification(
            {
              endpoint: subData.endpoint,
              keys: {
                p256dh: subData.keys.p256dh,
                auth: subData.keys.auth
              }
            },
            notificationPayload,
            {
              TTL: 86400,
              urgency: 'high',
              topic: payload.tag || 'solocab'
            }
          );

          console.log('✅ Push sent successfully');
          pushSentCount++;
          pushResults.push({
            endpoint: subData.endpoint.substring(0, 50),
            success: true
          });

        } catch (pushError: any) {
          console.error('❌ Push failed:', pushError.statusCode, pushError.body || pushError.message);

          await supabase.from('push_delivery_logs').insert({
            user_id: payload.user_id,
            channel: 'web',
            notification_type: payload.tag || 'generic',
            title: payload.title,
            body: payload.message,
            token_preview: subData.endpoint.substring(0, 24) + '…',
            success: false,
            status_code: pushError.statusCode || null,
            error_reason: (pushError.body || pushError.message || String(pushError)).slice(0, 500),
          }).then(() => {}, () => {});

          pushFailedCount++;
          pushResults.push({
            endpoint: subData.endpoint.substring(0, 50),
            success: false,
            error: pushError.message || String(pushError)
          });

          // Disable expired/invalid subscriptions (410 Gone, 404 Not Found)
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            console.log('Disabling expired subscription:', sub.id);
            await supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }
        }
      }

      console.log(`📬 Push results - sent: ${pushSentCount}, failed: ${pushFailedCount}`);
    }

    // ============= NATIVE PUSH (FCM Android + APNS iOS) =============
    // On invoque send-push-fcm en parallèle pour atteindre les apps natives installées.
    // Aucun fail si pas de token natif enregistré (la fonction tolère 0 destinataire).
    try {
      const isRideRequest = payload.type === 'incoming_ride' || (payload.tag || '').includes('course') || (payload.tag || '').includes('ride');
      const fcmResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-fcm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          user_ids: [payload.user_id],
          title: payload.title,
          body: payload.message,
          type: payload.type || (isRideRequest ? 'incoming_ride' : 'generic'),
          data: {
            link: payload.link || '/',
            tag: payload.tag || 'solocab',
            ...(payload.data || {}),
          },
        }),
      });
      const fcmJson = await fcmResponse.json().catch(() => ({}));
      console.log('[FCM relay] result', JSON.stringify({ ok: fcmResponse.ok, status: fcmResponse.status, ...fcmJson }));
    } catch (e) {
      console.warn('[FCM relay] sync error', e);
    }

    // Always create DB notification (backup for realtime)
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
