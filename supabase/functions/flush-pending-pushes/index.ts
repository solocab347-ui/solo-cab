/**
 * flush-pending-pushes : renvoie les notifs en attente pour un user.
 * Appelée par le client au reconnect ou quand un nouveau token est enregistré.
 *
 * Body: { user_id?: string }   // par défaut : user authentifié
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
    const userId = userData.user.id;
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Pull pending notifs for this user, not expired, not delivered
    const { data: pending, error } = await supa
      .from('push_pending_queue')
      .select('*')
      .eq('user_id', userId)
      .is('delivered_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ success: true, flushed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let delivered = 0;
    for (const item of pending) {
      // Crée juste la notification DB (le client la verra via realtime / list).
      // En parallèle, retente FCM via send-push-fcm (silently).
      const { error: insErr } = await supa.from('notifications').insert({
        user_id: userId,
        title: item.title,
        message: item.body,
        link: (item.data as Record<string, unknown>)?.link as string ?? '/notifications',
        type: item.notification_type === 'incoming_ride' ? 'ride' : 'push',
        is_read: false,
        category: item.notification_type,
        metadata: item.data ?? {},
      });

      // Best-effort retry FCM
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-push-fcm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
          body: JSON.stringify({
            user_ids: [userId],
            title: item.title,
            body: item.body,
            type: item.notification_type,
            data: item.data,
          }),
        });
      } catch { /* swallow */ }

      if (!insErr) {
        await supa
          .from('push_pending_queue')
          .update({ delivered_at: new Date().toISOString(), attempts: item.attempts + 1 })
          .eq('id', item.id);
        delivered++;
      }
    }

    return new Response(JSON.stringify({ success: true, flushed: delivered, total: pending.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[flush-pending-pushes] error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
