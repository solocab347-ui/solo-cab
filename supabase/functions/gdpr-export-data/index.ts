// RGPD Article 15 + 20 — export complet des données utilisateur
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b, null, 2), {
    status: s,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Tables containing user-owned data — best-effort export.
// Each table is queried with the user's JWT, so RLS automatically restricts to their rows.
const USER_TABLES: Array<{ table: string; column: string }> = [
  { table: 'profiles', column: 'user_id' },
  { table: 'driver_profiles', column: 'user_id' },
  { table: 'client_profiles', column: 'user_id' },
  { table: 'courses', column: 'client_id' },
  { table: 'courses', column: 'driver_id' },
  { table: 'ride_requests', column: 'client_id' },
  { table: 'ride_requests', column: 'driver_id' },
  { table: 'ratings', column: 'client_id' },
  { table: 'ratings', column: 'driver_id' },
  { table: 'invoices', column: 'user_id' },
  { table: 'payment_methods', column: 'user_id' },
  { table: 'notifications', column: 'user_id' },
  { table: 'messages', column: 'sender_id' },
  { table: 'client_addresses', column: 'user_id' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401);
    const user = userData.user;

    const exportData: Record<string, unknown> = {
      generated_at: new Date().toISOString(),
      legal_basis: 'RGPD Art. 15 (accès) + Art. 20 (portabilité)',
      account: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
      },
      data: {} as Record<string, unknown[]>,
      errors: [] as Array<{ table: string; column: string; message: string }>,
    };

    for (const { table, column } of USER_TABLES) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq(column, user.id)
          .limit(1000);
        if (error) {
          (exportData.errors as Array<unknown>).push({ table, column, message: error.message });
          continue;
        }
        if (data && data.length > 0) {
          const key = `${table}__${column}`;
          (exportData.data as Record<string, unknown[]>)[key] = data;
        }
      } catch (e) {
        (exportData.errors as Array<unknown>).push({
          table,
          column,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="solocab-export-${user.id}-${Date.now()}.json"`,
      },
    });
  } catch (e) {
    console.error('[gdpr-export-data] error', e);
    return json({ error: 'internal' }, 500);
  }
});
