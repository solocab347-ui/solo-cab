import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_PROJECT_URL = "https://lovable.dev/projects/bb7de2de-cc6d-441a-a380-0f8d244f90e4";
const ADMIN_BASE_URL = "https://solocab.fr";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function buildAnomalyCard(a: any): string {
  const sevColor = a.severity === "critical" ? "#ef4444" : "#f59e0b";
  const sevBg = a.severity === "critical" ? "#fef2f2" : "#fffbeb";
  const sevBorder = a.severity === "critical" ? "#fecaca" : "#fde68a";
  const sevLabel = a.severity === "critical" ? "🔴 CRITIQUE" : "🟡 ATTENTION";
  const promptText = a.lovable_prompt || "";
  const lovableUrl = `${LOVABLE_PROJECT_URL}?prompt=${encodeURIComponent(promptText)}`;
  const dashUrl = a.link ? `${ADMIN_BASE_URL}${a.link}` : "";

  return `
  <div style="background:${sevBg};border:1px solid ${sevBorder};border-left:4px solid ${sevColor};border-radius:8px;padding:16px;margin-bottom:14px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="background:${sevColor};color:white;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:0.5px;">${sevLabel}</span>
      <code style="font-size:11px;color:#6b7280;">${escapeHtml(a.type)}</code>
    </div>
    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#1f2937;">${escapeHtml(a.message || "")}</p>
    ${a.cause ? `<p style="margin:0 0 6px;font-size:13px;color:#4b5563;"><strong>🔍 Cause :</strong> ${escapeHtml(a.cause)}</p>` : ""}
    ${a.action ? `<p style="margin:0 0 10px;font-size:13px;color:#4b5563;"><strong>✅ Action :</strong> ${escapeHtml(a.action)}</p>` : ""}
    ${promptText ? `
      <div style="background:white;border:1px dashed #d1d5db;border-radius:6px;padding:10px;margin-top:8px;">
        <p style="margin:0 0 6px;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">💬 Prompt Lovable (à copier-coller)</p>
        <pre style="margin:0;font-size:12px;color:#1f2937;font-family:'SF Mono',Monaco,monospace;white-space:pre-wrap;word-wrap:break-word;">${escapeHtml(promptText)}</pre>
      </div>
    ` : ""}
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
      ${promptText ? `<a href="${lovableUrl}" style="background:#3b82f6;color:white;padding:8px 14px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">🚀 Résoudre dans Lovable</a>` : ""}
      ${dashUrl ? `<a href="${dashUrl}" style="background:#1f2937;color:white;padding:8px 14px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:600;">📊 Voir dans Admin</a>` : ""}
    </div>
  </div>`;
}

function metricRow(label: string, value: any, alertCondition?: boolean): string {
  const color = alertCondition ? "color:#ef4444;font-weight:700;" : "";
  return `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">${label}</td><td style="text-align:right;font-weight:600;${color}">${value}</td></tr>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization");
    let triggeredBy = "auto";

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: role } = await supabase
          .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (role) triggeredBy = `admin:${user.id}`;
      }
    }

    const { data: healthResult, error: rpcError } = await supabase.rpc("run_platform_health_check", {
      p_triggered_by: triggeredBy,
    });
    if (rpcError) throw rpcError;

    const result = healthResult as any;
    const d = result.data;
    const anomalies = result.anomalies || [];
    const status = result.status;
    const criticalCount = anomalies.filter((a: any) => a.severity === "critical").length;
    const warningCount = anomalies.filter((a: any) => a.severity === "warning").length;

    // === NOTIFICATIONS IN-APP ===
    const { data: adminUsers } = await supabase
      .from("user_roles").select("user_id").eq("role", "admin");

    if (adminUsers && adminUsers.length > 0) {
      const statusEmoji = status === "ok" ? "✅" : status === "warning" ? "⚠️" : "🚨";
      const statusLabel = status === "ok" ? "Opérationnel" : status === "warning" ? "Attention requise" : "Critique";
      const triggerLabel = triggeredBy.startsWith("admin") ? "Manuel" : "Automatique";

      const notifTitle = `${statusEmoji} Rapport santé — ${statusLabel}`;
      const summaryLines = [
        `📊 Rapport ${triggerLabel} — ${new Date().toLocaleDateString("fr-FR")}`,
        ``,
        `👨‍✈️ Chauffeurs: ${d.active_drivers} actifs (${d.drivers_online_total || 0} en ligne, GPS health ${d.drivers_gps_health_pct || 0}%)`,
        `📈 Inscriptions: ${d.inscriptions_today} aujourd'hui (moy: ${d.inscriptions_avg_30d}/j)`,
        `🚗 Courses: ${d.courses_today} aujourd'hui, conv. ${d.conversion_rate_7d}%, ${d.courses_stuck} bloquées`,
        `💳 Paiements: ${d.payment_success_rate}% succès, ${d.failed_transfers_pending} virements bloqués`,
        `🛡️ Fraude: ${d.clients_blocked} bloqués, ${d.clients_high_risk} à risque, ${d.fraud_flags_open} signalements`,
        `📧 Emails: ${d.email_dlq_24h} DLQ, ${d.email_failed_24h} échecs (24h)`,
        `⚙️ Cron: ${d.cron_failed_recent} en échec récent`,
        anomalies.length > 0
          ? `\n🔴 ${anomalies.length} anomalie(s) (${criticalCount} crit / ${warningCount} warn)`
          : `\n✅ Aucune anomalie détectée — Tout va bien`,
      ];

      const notifications = adminUsers.map((admin: any) => ({
        user_id: admin.user_id,
        title: notifTitle,
        message: summaryLines.join("\n"),
        type: status === "ok" ? "success" : status === "warning" ? "warning" : "error",
        link: "/admin-dashboard?section=tech&tab=health",
        category: "platform_health",
        is_read: false,
      }));

      await supabase.from("notifications").insert(notifications);
      console.log(`📨 Notifications envoyées à ${adminUsers.length} admin(s)`);
    }

    // === EMAIL ===
    if (resendKey) {
      const resend = new Resend(resendKey);
      const adminIds = adminUsers?.map((a: any) => a.user_id) || [];
      if (adminIds.length > 0) {
        const { data: adminProfiles } = await supabase
          .from("profiles").select("email").in("id", adminIds);
        const adminEmails = adminProfiles?.map((p: any) => p.email).filter(Boolean) || [];

        if (adminEmails.length > 0) {
          const statusColor = status === "ok" ? "#10b981" : status === "warning" ? "#f59e0b" : "#ef4444";
          const statusLabel = status === "ok" ? "✅ Opérationnel" : status === "warning" ? "⚠️ Attention" : "🚨 Critique";
          const triggerLabel = triggeredBy.startsWith("admin") ? "Manuel" : "Automatique";
          const dateStr = new Date().toLocaleDateString("fr-FR", {
            weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
          });

          const urgentBlock = anomalies.length > 0 ? `
            <div style="background:#1f2937;color:white;padding:20px 28px;">
              <h2 style="margin:0 0 8px;font-size:18px;">🚨 ${anomalies.length} action(s) requise(s)</h2>
              <p style="margin:0;font-size:13px;opacity:0.85;">
                ${criticalCount} critique${criticalCount > 1 ? "s" : ""} · ${warningCount} avertissement${warningCount > 1 ? "s" : ""}
              </p>
            </div>
            <div style="background:white;padding:20px 28px;border-bottom:1px solid #e5e7eb;">
              ${anomalies.map(buildAnomalyCard).join("")}
            </div>
          ` : `
            <div style="background:#ecfdf5;padding:24px 28px;text-align:center;border-bottom:1px solid #a7f3d0;">
              <h2 style="margin:0 0 6px;color:#065f46;font-size:18px;">✅ Tout est opérationnel</h2>
              <p style="margin:0;color:#047857;font-size:13px;">Aucune anomalie détectée. Les ${Object.keys(d).length} métriques surveillées sont au vert.</p>
            </div>
          `;

          const emailHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:680px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#1e293b,#334155);border-radius:12px 12px 0 0;padding:24px 28px;color:white;">
      <h1 style="margin:0;font-size:22px;font-weight:700;">🏥 Rapport Santé SoloCab</h1>
      <p style="margin:6px 0 0;opacity:0.8;font-size:13px;">${dateStr} — Déclenchement ${triggerLabel}</p>
    </div>
    <div style="background:${statusColor};padding:14px 28px;color:white;font-weight:600;font-size:15px;">
      Statut global: ${statusLabel}
    </div>

    ${urgentBlock}

    <div style="background:white;padding:24px 28px;border:1px solid #e5e7eb;border-top:none;">
      <h2 style="font-size:15px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #3b82f6;padding-bottom:6px;">👨‍✈️ Chauffeurs</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        ${metricRow("Validés", d.active_drivers)}
        ${metricRow("En attente", d.pending_drivers, d.pending_drivers > 10)}
        ${metricRow("En ligne (live)", d.drivers_online_total)}
        ${metricRow("GPS health", `${d.drivers_gps_health_pct}%`, d.drivers_gps_health_pct < 70)}
        ${metricRow("Sans Stripe Connect", d.drivers_no_stripe, d.drivers_no_stripe > 5)}
      </table>

      <h2 style="font-size:15px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #8b5cf6;padding-bottom:6px;">📈 Inscriptions & Onboarding</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        ${metricRow("Inscriptions aujourd'hui", d.inscriptions_today)}
        ${metricRow("Moyenne 30j", `${d.inscriptions_avg_30d}/j`)}
        ${metricRow("Taux onboarding (7j)", `${d.onboarding_rate}%`, d.onboarding_rate < 50)}
      </table>

      <h2 style="font-size:15px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #a855f7;padding-bottom:6px;">📄 Documents (réel)</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        ${metricRow("À valider", d.funnel_docs_pending, d.funnel_docs_pending > 20)}
        ${metricRow("Validés", d.funnel_docs_validated)}
        ${metricRow("Rejetés (30j)", d.funnel_docs_rejected, d.funnel_docs_rejected > 5)}
        ${metricRow("Expirés (encore validés)", d.funnel_docs_expired, d.funnel_docs_expired > 0)}
      </table>

      <h2 style="font-size:15px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #10b981;padding-bottom:6px;">🚗 Courses</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        ${metricRow("Aujourd'hui", d.courses_today)}
        ${metricRow("Complétées (7j)", d.courses_completed_7d)}
        ${metricRow("Annulées (7j)", d.courses_cancelled_7d)}
        ${metricRow("Bloquées >24h", d.courses_stuck, d.courses_stuck > 0)}
        ${metricRow("Taux conversion (7j)", `${d.conversion_rate_7d}%`, d.conversion_rate_7d < 50)}
        ${metricRow("Demandes en attente >15min", d.ride_requests_stuck, d.ride_requests_stuck > 0)}
      </table>

      <h2 style="font-size:15px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #f59e0b;padding-bottom:6px;">💳 Paiements & Stripe</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        ${metricRow("Taux succès (7j)", `${d.payment_success_rate}%`, d.payment_success_rate < 90)}
        ${metricRow("Échecs paiements (7j)", d.payments_failed_7d, d.payments_failed_7d > 0)}
        ${metricRow("Stripe sans payouts", d.stripe_no_payouts, d.stripe_no_payouts > 0)}
        ${metricRow("Stripe incomplet", d.stripe_no_details, d.stripe_no_details > 0)}
        ${metricRow("Virements bloqués", d.failed_transfers_pending, d.failed_transfers_pending > 0)}
        ${metricRow("Virements bloqués >7j", d.failed_transfers_critical, d.failed_transfers_critical > 0)}
      </table>

      <h2 style="font-size:15px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #ef4444;padding-bottom:6px;">🛡️ Sécurité & Fraude</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        ${metricRow("Clients bloqués", d.clients_blocked)}
        ${metricRow("Clients à risque (score ≤ -3)", d.clients_high_risk, d.clients_high_risk > 5)}
        ${metricRow("Signalements fraude ouverts", d.fraud_flags_open, d.fraud_flags_open > 10)}
        ${metricRow("IPs bloquées actives", d.blocked_ips_active)}
        ${metricRow("Litiges notation ouverts", d.disputes_open, d.disputes_open > 5)}
      </table>

      <h2 style="font-size:15px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #06b6d4;padding-bottom:6px;">📧 Communications</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        ${metricRow("Emails DLQ (24h)", d.email_dlq_24h, d.email_dlq_24h > 5)}
        ${metricRow("Emails échoués (24h)", d.email_failed_24h, d.email_failed_24h > 10)}
        ${metricRow("Adresses suppressed", d.suppressed_emails_total)}
        ${metricRow("Push subscriptions", d.push_subscriptions_total)}
      </table>

      <h2 style="font-size:15px;color:#1e293b;margin:0 0 12px;border-bottom:2px solid #6366f1;padding-bottom:6px;">⚙️ Système</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
        ${metricRow("Cron jobs en échec (24h)", d.cron_failed_recent, d.cron_failed_recent > 0)}
        ${metricRow("Cron jobs inactifs", d.cron_inactive, d.cron_inactive > 0)}
        ${metricRow("Abonnements actifs", d.subscriptions_active)}
        ${metricRow("Abonnements échoués (7j)", d.subscriptions_expired_7d, d.subscriptions_expired_7d > 3)}
        ${metricRow("QR codes orphelins", d.qr_orphaned, d.qr_orphaned > 0)}
        ${metricRow("Taille base de données", `${d.db_size_mb} MB`)}
      </table>
    </div>

    <div style="background:#f3f4f6;border-radius:0 0 12px 12px;padding:16px 28px;text-align:center;border:1px solid #e5e7eb;border-top:none;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">SoloCab — ${dateStr}</p>
      <p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">Toutes les métriques sont mesurées en live à l'instant du rapport.</p>
    </div>
  </div>
</body></html>`;

          for (const email of adminEmails) {
            try {
              await resend.emails.send({
                from: "SoloCab <noreply@solocab.fr>",
                to: email,
                subject: `[SoloCab] Rapport santé ${statusLabel} — ${anomalies.length > 0 ? `${anomalies.length} action(s)` : "RAS"}`,
                html: emailHtml,
              });
              console.log(`📧 Email envoyé à ${email}`);
            } catch (emailErr: any) {
              console.error(`❌ Erreur envoi à ${email}:`, emailErr.message);
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500
    });
  }
});
