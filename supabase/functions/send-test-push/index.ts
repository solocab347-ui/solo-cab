/**
 * send-test-push : envoi de test admin (incoming_ride ou generic) vers un user
 *
 * Body: { target_user_id: string, type?: 'incoming_ride'|'generic', title?, body? }
 * Vérifie que l'appelant est admin avant d'invoquer send-push-notification.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Auth required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is admin
    const supaUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: uErr } = await supaUser.auth.getUser();
    if (uErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await supa
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const target = body.target_user_id as string;
    const type = (body.type || 'incoming_ride') as 'incoming_ride' | 'generic';
    const title = body.title || (type === 'incoming_ride' ? '🚖 Test course' : '🔔 Test notification');
    const message = body.body || (type === 'incoming_ride'
      ? 'Course test : Place de la République → Gare du Nord (12,50 €)'
      : 'Notification de test depuis le dashboard admin');

    if (!target) {
      return new Response(JSON.stringify({ error: 'target_user_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Invoke send-push-notification (web + relais FCM)
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        user_id: target,
        title,
        message,
        link: type === 'incoming_ride' ? '/driver-dashboard?incoming=test' : '/notifications',
        tag: type === 'incoming_ride' ? 'course-test' : 'test',
        type,
        data: type === 'incoming_ride'
          ? { ride_id: 'test-' + Date.now(), pickup_address: 'Départ test SoloCab', destination_address: 'Arrivée test', price: '12,50€' }
          : {},
      }),
    });
    const json = await r.json().catch(() => ({}));

    // Direct FCM call too (in case web push fails / no web subscription)
    const r2 = await fetch(`${SUPABASE_URL}/functions/v1/send-push-fcm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        user_ids: [target],
        title,
        body: message,
        type,
        data: { ride_id: 'test-' + Date.now(), link: '/driver-dashboard?incoming=test' },
      }),
    });
    const json2 = await r2.json().catch(() => ({}));

    // Log test
    await supa.from('push_delivery_logs').insert({
      user_id: target,
      channel: 'test',
      notification_type: type,
      title,
      body: message,
      success: true,
      metadata: { web_push: json, fcm: json2, triggered_by: userData.user.id },
    });

    return new Response(JSON.stringify({
      success: true,
      web_push: json,
      fcm: json2,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[send-test-push] error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
