/**
 * driver-self-test-incoming-ride
 *
 * Permet à un chauffeur whitelisté d'envoyer un faux `incoming_ride`
 * à son propre device pour vérifier overlay / son / accept / deep-link.
 *
 * Whitelist d'emails (limité pour éviter abus production).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pairing: la clé (email appelant) envoie un faux incoming_ride à la valeur (user_id cible).
// Permet à Abdallah & Alexandre de se tester mutuellement en condition réelle.
const ABDALLAH_USER_ID = '3b0c81e6-f10b-4849-b36d-0494441454a7';
const ALEXANDRE_USER_ID = '457fc4a2-13f0-4d5b-9d4c-eeb8f3b7dc3c';

const PEER_MAP: Record<string, { user_id: string; label: string }> = {
  'abdallahkanoute080@gmail.com': { user_id: ALEXANDRE_USER_ID, label: 'Alexandre' },
  'abdallahkanoute72@gmail.com':  { user_id: ALEXANDRE_USER_ID, label: 'Alexandre' },
  'alexandrediarra00@gmail.com':  { user_id: ABDALLAH_USER_ID,  label: 'Abdallah' },
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supaUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: uErr } = await supaUser.auth.getUser();
    if (uErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const email = (userData.user.email || '').toLowerCase();
    const peer = PEER_MAP[email];
    if (!peer) {
      return new Response(JSON.stringify({ error: 'Not allowed for this account' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const target = peer.user_id;
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    const title = '🚖 Test course entrante';
    const message = `Place de la République → Gare du Nord · 12,50 € (envoyé par ${email})`;
    const rideId = 'peer-test-' + Date.now();

    const payload = {
      user_id: target,
      title,
      message,
      link: '/driver-dashboard?incoming=test',
      tag: 'course-test',
      type: 'incoming_ride',
      data: {
        ride_id: rideId,
        pickup_address: 'Place de la République, Paris',
        destination_address: 'Gare du Nord, Paris',
        price: '12,50€',
      },
    };

    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify(payload),
    });
    const json = await r.json().catch(() => ({}));

    const r2 = await fetch(`${SUPABASE_URL}/functions/v1/send-push-fcm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        user_ids: [target],
        title,
        body: message,
        type: 'incoming_ride',
        data: { ride_id: rideId, link: '/driver-dashboard?incoming=test' },
      }),
    });
    const json2 = await r2.json().catch(() => ({}));

    await supa.from('push_delivery_logs').insert({
      user_id: target,
      channel: 'self-test',
      notification_type: 'incoming_ride',
      title,
      body: message,
      success: true,
      metadata: { web_push: json, fcm: json2, triggered_by: target, email },
    });

    return new Response(JSON.stringify({ success: true, web_push: json, fcm: json2 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[driver-self-test-incoming-ride] error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
