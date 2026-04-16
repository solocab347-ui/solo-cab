import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resendKey = Deno.env.get("RESEND_API_KEY");

    // Determine trigger source
    const authHeader = req.headers.get("Authorization");
    let triggeredBy = "auto";
    let adminUserId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (role) {
          triggeredBy = `admin:${user.id}`;
          adminUserId = user.id;
        }
      }
    }

    // Run the health check
    const { data: healthResult, error: rpcError } = await supabase.rpc("run_platform_health_check", {
      p_triggered_by: triggeredBy,
    });

    if (rpcError) throw rpcError;

    const result = healthResult as any;
    const d = result.data;
    const anomalies = result.anomalies || [];
    const status = result.status;

    // === 1. SEND NOTIFICATIONS TO ALL ADMINS ===
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminUsers && adminUsers.length > 0) {
      const statusEmoji = status === "ok" ? "✅" : status === "warning" ? "⚠️" : "🚨";
      const statusLabel = status === "ok" ? "Opérationnel" : status === "warning" ? "Attention requise" : "Critique";
      const triggerLabel = triggeredBy.startsWith("admin") ? "Manuel" : "Automatique";

      const notifTitle = `${statusEmoji} Rapport santé plateforme — ${statusLabel}`;
      const notifMessage = [
        `📊 Rapport ${triggerLabel} — ${new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
        ``,
        `👨‍✈️ Chauffeurs: ${d.active_drivers} actifs, ${d.pending_drivers} en attente`,
        `📈 Inscriptions: ${d.inscriptions_today} aujourd'hui (moy: ${d.inscriptions_avg_30d}/j)`,
        `🎓 Onboarding: ${d.onboarding_rate}% (${d.onboarding_completed_7d}/${d.onboarding_total_7d})`,
        `🚗 Courses: ${d.courses_today} aujourd'hui, ${d.courses_errors} erreurs`,
        `💳 Paiements: ${d.payment_success_rate}% succès (${d.payments_failed_7d} échecs sur 7j)`,
        `⚠️ Sans Stripe: ${d.drivers_no_stripe} | Sans paiement: ${d.courses_no_payment}`,
        `📋 Litiges: ${d.disputes_open} ouverts`,
        anomalies.length > 0 ? `\n🔴 ${anomalies.length} anomalie(s) détectée(s):\n${anomalies.map((a: any) => `  • ${a.message}`).join("\n")}` : `\n✅ Aucune anomalie détectée`,
      ].join("\n");

      const notifications = adminUsers.map((admin: any) => ({
        user_id: admin.user_id,
        title: notifTitle,
        message: notifMessage,
        type: status === "ok" ? "success" : status === "warning" ? "warning" : "error",
        link: "/admin-dashboard?section=tech&tab=health",
        category: "platform_health",
        is_read: false,
      }));

      await supabase.from("notifications").insert(notifications);
      console.log(`📨 Notifications envoyées à ${adminUsers.length} admin(s)`);
    }

    // === 2. SEND EMAIL TO ADMIN(S) ===
    if (resendKey) {
      const resend = new Resend(resendKey);

      // Get admin emails
      const adminIds = adminUsers?.map((a: any) => a.user_id) || [];
      if (adminIds.length > 0) {
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("email")
          .in("id", adminIds);

        const adminEmails = adminProfiles?.map((p: any) => p.email).filter(Boolean) || [];

        if (adminEmails.length > 0) {
          const statusColor = status === "ok" ? "#10b981" : status === "warning" ? "#f59e0b" : "#ef4444";
          const statusLabel = status === "ok" ? "✅ Opérationnel" : status === "warning" ? "⚠️ Attention" : "🚨 Critique";
          const triggerLabel = triggeredBy.startsWith("admin") ? "Manuel" : "Automatique";
          const dateStr = new Date().toLocaleDateString("fr-FR", {
            weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
          });

          const anomalyRows = anomalies.map((a: any) => `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${a.severity === 'critical' ? '#ef4444' : '#f59e0b'};margin-right:6px;"></span>
                ${a.severity === 'critical' ? '🔴' : '🟡'} ${a.type}
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151;">${a.message}</td>
            </tr>
          `).join("");

          const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:20px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e293b,#334155);border-radius:12px 12px 0 0;padding:24px 28px;color:white;">
      <h1 style="margin:0;font-size:22px;font-weight:700;">🏥 Rapport Santé SoloCab</h1>
      <p style="margin:6px 0 0;opacity:0.8;font-size:13px;">${dateStr} — ${triggerLabel}</p>
    </div>

    <!-- Status Banner -->
    <div style="background:${statusColor};padding:16px 28px;color:white;font-weight:600;font-size:16px;">
      Statut global: ${statusLabel}
    </div>

    <!-- Content -->
    <div style="background:white;padding:28px;border:1px solid #e5e7eb;">
      
      <!-- Section Chauffeurs -->
      <h2 style="font-size:16px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #3b82f6;padding-bottom:6px;">👨‍✈️ Chauffeurs</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Actifs</td><td style="font-weight:600;text-align:right;">${d.active_drivers}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">En attente validation</td><td style="font-weight:600;text-align:right;${d.pending_drivers > 5 ? 'color:#f59e0b;' : ''}">${d.pending_drivers}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Sans Stripe Connect</td><td style="font-weight:600;text-align:right;${d.drivers_no_stripe > 3 ? 'color:#ef4444;' : ''}">${d.drivers_no_stripe}</td></tr>
      </table>

      <!-- Section Inscriptions -->
      <h2 style="font-size:16px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #8b5cf6;padding-bottom:6px;">📈 Inscriptions & Onboarding</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Inscriptions aujourd'hui</td><td style="font-weight:600;text-align:right;">${d.inscriptions_today}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Moyenne 30 jours</td><td style="font-weight:600;text-align:right;">${d.inscriptions_avg_30d}/jour</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Taux d'onboarding (7j)</td><td style="font-weight:600;text-align:right;${d.onboarding_rate < 50 ? 'color:#ef4444;' : 'color:#10b981;'}">${d.onboarding_rate}%</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Complétés / Total</td><td style="font-weight:600;text-align:right;">${d.onboarding_completed_7d} / ${d.onboarding_total_7d}</td></tr>
      </table>

      <!-- Section Courses -->
      <h2 style="font-size:16px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #10b981;padding-bottom:6px;">🚗 Courses</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Courses aujourd'hui</td><td style="font-weight:600;text-align:right;">${d.courses_today}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Erreurs</td><td style="font-weight:600;text-align:right;${d.courses_errors > 0 ? 'color:#ef4444;' : ''}">${d.courses_errors}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Sans paiement (7j)</td><td style="font-weight:600;text-align:right;${d.courses_no_payment > 0 ? 'color:#f59e0b;' : ''}">${d.courses_no_payment}</td></tr>
      </table>

      <!-- Section Paiements -->
      <h2 style="font-size:16px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #f59e0b;padding-bottom:6px;">💳 Paiements</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Taux de succès (7j)</td><td style="font-weight:600;text-align:right;${d.payment_success_rate < 90 ? 'color:#ef4444;' : 'color:#10b981;'}">${d.payment_success_rate}%</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Paiements échoués</td><td style="font-weight:600;text-align:right;${d.payments_failed_7d > 0 ? 'color:#ef4444;' : ''}">${d.payments_failed_7d}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Total paiements</td><td style="font-weight:600;text-align:right;">${d.payments_total_7d}</td></tr>
      </table>

      <!-- Section Litiges -->
      <h2 style="font-size:16px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #ef4444;padding-bottom:6px;">📋 Litiges</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Litiges ouverts</td><td style="font-weight:600;text-align:right;${d.disputes_open > 0 ? 'color:#ef4444;' : ''}">${d.disputes_open}</td></tr>
      </table>

      ${anomalies.length > 0 ? `
      <!-- Anomalies -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-top:12px;">
        <h3 style="margin:0 0 10px;font-size:15px;color:#991b1b;">🔴 Anomalies détectées (${anomalies.length})</h3>
        <table style="width:100%;border-collapse:collapse;">
          ${anomalyRows}
        </table>
      </div>
      ` : `
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:16px;margin-top:12px;text-align:center;">
        <p style="margin:0;color:#065f46;font-weight:600;">✅ Aucune anomalie détectée — Tout est opérationnel</p>
      </div>
      `}
    </div>

    <!-- Footer -->
    <div style="background:#f3f4f6;border-radius:0 0 12px 12px;padding:16px 28px;text-align:center;border:1px solid #e5e7eb;border-top:none;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        SoloCab — Rapport généré automatiquement le ${dateStr}
      </p>
      <p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">
        Connectez-vous au dashboard admin pour voir les détails et agir.
      </p>
    </div>
  </div>
</body>
</html>`;

          for (const email of adminEmails) {
            try {
              await resend.emails.send({
                from: "SoloCab <noreply@solocab.fr>",
                to: email,
                subject: `[SoloCab] Rapport santé ${statusLabel} — ${new Date().toLocaleDateString("fr-FR")}`,
                html: emailHtml,
              });
              console.log(`📧 Email rapport envoyé à ${email}`);
            } catch (emailErr: any) {
              console.error(`❌ Erreur envoi email à ${email}:`, emailErr.message);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
