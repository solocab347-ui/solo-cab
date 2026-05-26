// Détecte les règlements hebdomadaires bloqués en "processing" depuis > 24h.
// Alerte les admins (notification + email) et marque le run comme "failed".
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: stuck, error } = await supabase
      .from("weekly_settlements")
      .select("id, week_start, week_end, created_at, last_heartbeat_at, drivers_processed_count")
      .eq("status", "processing")
      .lt("created_at", cutoff);
    if (error) throw error;

    if (!stuck || stuck.length === 0) {
      return new Response(JSON.stringify({ stuck: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Marquer chaque run bloqué comme "failed"
    const ids = stuck.map((s: any) => s.id);
    await supabase.from("weekly_settlements").update({
      status: "failed",
      error_message: "Run bloqué en processing > 24h — détection automatique",
      processed_at: new Date().toISOString(),
    }).in("id", ids);

    // Alerter les admins
    const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      const summary = stuck.map((s: any) => `${s.week_start} → ${s.week_end}`).join(", ");
      await supabase.from("notifications").insert(admins.map((a: any) => ({
        user_id: a.user_id,
        title: "🚨 Règlements hebdo bloqués",
        message: `${stuck.length} règlement(s) en "processing" depuis > 24h marqué(s) comme échoué(s) : ${summary}`,
        type: "warning",
        link: "/admin/finance/settlements",
      })));

      // Email aux admins
      try {
        const { data: profiles } = await supabase.from("profiles")
          .select("email").in("id", admins.map((a: any) => a.user_id));
        const emails = (profiles || []).map((p: any) => p.email).filter(Boolean);
        if (emails.length) {
          const rows = stuck.map((s: any) =>
            `<tr><td style="padding:6px;border:1px solid #ddd">${s.week_start} → ${s.week_end}</td>` +
            `<td style="padding:6px;border:1px solid #ddd">${s.drivers_processed_count ?? 0}</td>` +
            `<td style="padding:6px;border:1px solid #ddd">${s.last_heartbeat_at ?? '—'}</td></tr>`
          ).join("");
          const htmlBody = `
            <h2 style="color:#dc2626">🚨 Règlements hebdo bloqués</h2>
            <p>${stuck.length} run(s) en "processing" depuis plus de 24h ont été marqué(s) comme échoué(s).</p>
            <table style="border-collapse:collapse;width:100%;margin:12px 0">
              <tr style="background:#f3f4f6"><th style="padding:6px;border:1px solid #ddd">Semaine</th><th style="padding:6px;border:1px solid #ddd">Chauffeurs traités</th><th style="padding:6px;border:1px solid #ddd">Dernier heartbeat</th></tr>
              ${rows}
            </table>
            <p><a href="https://solocab.fr/admin/finance/settlements">Ouvrir le dashboard règlements</a></p>
          `;
          await Promise.allSettled(emails.map((email: string) =>
            supabase.functions.invoke("send-email", {
              body: { emailType: "custom", to: email, data: {
                subject: `🚨 ${stuck.length} règlement(s) hebdo bloqué(s)`,
                headerTitle: "Alerte règlements bloqués", htmlBody,
              } },
            })
          ));
        }
      } catch (_) { /* email best-effort */ }
    }

    return new Response(JSON.stringify({
      stuck: stuck.length,
      marked_failed: ids,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
