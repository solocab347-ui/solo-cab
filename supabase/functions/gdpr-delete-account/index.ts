// RGPD Article 17 — droit à l'effacement
// Anonymise les données nécessaires à la conservation légale (factures 10 ans),
// supprime tout le reste, puis désactive le compte auth.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const Body = z.object({
  confirmation: z.literal('SUPPRIMER MON COMPTE'),
  reason: z.string().max(500).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401);
    const user = userData.user;

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json({ error: 'confirmation_required', details: parsed.error.flatten() }, 400);
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const log = {
      user_id: user.id,
      email: user.email,
      reason: parsed.data.reason ?? null,
      requested_at: new Date().toISOString(),
      anonymized: [] as string[],
      deleted: [] as string[],
      errors: [] as Array<{ step: string; message: string }>,
    };

    // 1) ANONYMISATION — factures + paiements (obligation légale 10 ans)
    const anonymize = async (table: string, column: string, fields: Record<string, unknown>) => {
      const { error } = await admin.from(table).update(fields).eq(column, user.id);
      if (error) log.errors.push({ step: `anonymize:${table}`, message: error.message });
      else log.anonymized.push(table);
    };
    await anonymize('invoices', 'user_id', {
      user_id: null,
      anonymized: true,
      anonymized_at: new Date().toISOString(),
      client_name: 'CLIENT_ANONYMISÉ',
      client_email: null,
      client_phone: null,
      client_address: null,
    });

    // 2) SUPPRESSION — données opérationnelles
    const drop = async (table: string, column: string) => {
      const { error } = await admin.from(table).delete().eq(column, user.id);
      if (error) log.errors.push({ step: `delete:${table}`, message: error.message });
      else log.deleted.push(table);
    };
    for (const t of [
      'notifications',
      'messages',
      'client_addresses',
      'payment_methods',
      'driver_locations',
      'gps_spoof_events',
    ]) {
      await drop(t, 'user_id');
    }
    await drop('profiles', 'user_id');
    await drop('driver_profiles', 'user_id');
    await drop('client_profiles', 'user_id');

    // 3) Audit log RGPD (table sécurité)
    try {
      await admin.from('security_audit_log').insert({
        action: 'gdpr_delete_account',
        actor_user_id: user.id,
        target_user_id: user.id,
        metadata: log,
      });
    } catch (e) {
      console.error('[gdpr-delete-account] audit log failed', e);
    }

    // 4) Suppression auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      log.errors.push({ step: 'auth.deleteUser', message: delErr.message });
      return json({ ok: false, log }, 500);
    }

    return json({ ok: true, log });
  } catch (e) {
    console.error('[gdpr-delete-account] error', e);
    return json({ error: 'internal' }, 500);
  }
});
