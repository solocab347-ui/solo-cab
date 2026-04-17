import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Users, Car, CreditCard, Shield, TrendingUp, Loader2,
  Clock, Zap, UserPlus, Wallet, Download, Mail, QrCode,
  ArrowRight, Ban, FileWarning, GitBranch
} from "lucide-react";
import jsPDF from "jspdf";

interface HealthData {
  status: string;
  data: {
    inscriptions_today: number;
    inscriptions_avg_30d: number;
    onboarding_total_7d: number;
    onboarding_completed_7d: number;
    onboarding_rate: number;
    courses_today: number;
    courses_errors: number;
    payments_failed_7d: number;
    payments_total_7d: number;
    payment_success_rate: number;
    drivers_no_stripe: number;
    pending_drivers: number;
    active_drivers: number;
    courses_no_payment: number;
    disputes_open: number;
    // NEW
    qr_total: number;
    qr_active: number;
    qr_orphaned: number;
    stripe_no_payouts: number;
    stripe_no_details: number;
    stripe_abnormal: number;
    funnel_step_profile: number;
    funnel_step_documents: number;
    funnel_step_stripe: number;
    funnel_step_review: number;
    funnel_docs_submitted: number;
    funnel_docs_rejected: number;
    courses_cancelled_7d: number;
    courses_stuck: number;
    courses_completed_7d: number;
    conversion_rate_7d: number;
  };
  anomalies: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
  checked_at: string;
}

interface HealthAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
}

interface HealthLog {
  id: string;
  check_type: string;
  status: string;
  details: any;
  anomalies: any;
  checked_at: string;
  triggered_by: string;
}

const PlatformHealthDashboard = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [alertsRes, logsRes] = await Promise.all([
        supabase
          .from("platform_health_alerts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("platform_health_logs")
          .select("*")
          .order("checked_at", { ascending: false })
          .limit(10),
      ]);

      if (alertsRes.data) setAlerts(alertsRes.data as HealthAlert[]);
      if (logsRes.data) {
        setLogs(logsRes.data as HealthLog[]);
        if (logsRes.data.length > 0) {
          const latest = logsRes.data[0] as any;
          setHealthData({
            status: latest.status,
            data: latest.details,
            anomalies: latest.anomalies || [],
            checked_at: latest.checked_at,
          });
        }
      }
    } catch (error) {
      console.error("Error loading health data:", error);
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("platform-health-check");
      if (error) throw error;
      setHealthData(data as HealthData);
      toast.success("Vérification terminée — notification et email envoyés");
      await loadData();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setRunning(false);
    }
  };

  const sendDailyReport = async () => {
    setSendingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-daily-report");
      if (error) throw error;
      const count = (data as any)?.reports_sent ?? 0;
      toast.success(`Rapport quotidien envoyé à ${count} chauffeur(s)`);
    } catch (error: any) {
      toast.error("Erreur rapport quotidien: " + error.message);
    } finally {
      setSendingReport(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from("platform_health_alerts")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", alertId);
    if (error) {
      toast.error("Erreur lors de la résolution");
    } else {
      toast.success("Alerte résolue");
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_resolved: true } : a));
    }
  };

  const generatePDF = (data?: HealthData) => {
    const report = data || healthData;
    if (!report) return;

    const d = report.data;
    const doc = new jsPDF();
    const dateStr = new Date(report.checked_at).toLocaleDateString("fr-FR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
    });

    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Rapport Santé Plateforme SoloCab", 15, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(dateStr, 15, 28);

    // Status bar
    const statusColors: Record<string, [number, number, number]> = {
      ok: [16, 185, 129],
      warning: [245, 158, 11],
      critical: [239, 68, 68],
    };
    const sc = statusColors[report.status] || statusColors.warning;
    doc.setFillColor(sc[0], sc[1], sc[2]);
    doc.rect(0, 35, 210, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const statusText = report.status === "ok" ? "OPÉRATIONNEL" : report.status === "warning" ? "ATTENTION REQUISE" : "CRITIQUE";
    doc.text(`Statut: ${statusText}`, 15, 42);

    let y = 55;
    doc.setTextColor(30, 41, 59);

    const addSection = (title: string, items: [string, string | number, boolean?][]) => {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(title, 15, y);
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(15, y + 2, 195, y + 2);
      y += 10;

      doc.setFontSize(11);
      items.forEach(([label, value, isAlert]) => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "normal");
        doc.setTextColor(107, 114, 128);
        doc.text(label, 20, y);
        doc.setFont("helvetica", "bold");
        if (isAlert) {
          doc.setTextColor(239, 68, 68);
        } else {
          doc.setTextColor(30, 41, 59);
        }
        doc.text(String(value), 160, y, { align: "right" });
        y += 7;
      });
      y += 5;
    };

    addSection("Chauffeurs", [
      ["Chauffeurs actifs", d.active_drivers],
      ["En attente de validation", d.pending_drivers, d.pending_drivers > 5],
      ["Sans Stripe Connect", d.drivers_no_stripe, d.drivers_no_stripe > 3],
    ]);

    addSection("Inscriptions & Onboarding", [
      ["Inscriptions aujourd'hui", d.inscriptions_today],
      ["Moyenne 30 jours", `${d.inscriptions_avg_30d}/jour`],
      ["Taux d'onboarding (7j)", `${d.onboarding_rate}%`, d.onboarding_rate < 50],
      ["Complétés / Total", `${d.onboarding_completed_7d} / ${d.onboarding_total_7d}`],
    ]);

    addSection("Funnel Onboarding (30j)", [
      ["Étape Profil", d.funnel_step_profile ?? 0],
      ["Étape Documents", d.funnel_step_documents ?? 0],
      ["Étape Stripe", d.funnel_step_stripe ?? 0],
      ["En attente validation", d.funnel_step_review ?? 0],
      ["Docs soumis", d.funnel_docs_submitted ?? 0],
      ["Docs rejetés", d.funnel_docs_rejected ?? 0, (d.funnel_docs_rejected ?? 0) > 2],
    ]);

    addSection("Courses", [
      ["Courses aujourd'hui", d.courses_today],
      ["Erreurs", d.courses_errors, d.courses_errors > 0],
      ["Sans paiement (7j)", d.courses_no_payment, d.courses_no_payment > 0],
      ["Complétées (7j)", d.courses_completed_7d ?? 0],
      ["Annulées (7j)", d.courses_cancelled_7d ?? 0],
      ["Bloquées (+3h)", d.courses_stuck ?? 0, (d.courses_stuck ?? 0) > 0],
      ["Taux conversion (7j)", `${d.conversion_rate_7d ?? 0}%`, (d.conversion_rate_7d ?? 0) < 50],
    ]);

    addSection("Paiements & Stripe", [
      ["Taux de succès (7j)", `${d.payment_success_rate}%`, d.payment_success_rate < 90],
      ["Paiements échoués (7j)", d.payments_failed_7d, d.payments_failed_7d > 0],
      ["Total paiements (7j)", d.payments_total_7d],
      ["Stripe sans payouts", d.stripe_no_payouts ?? 0, (d.stripe_no_payouts ?? 0) > 0],
      ["Stripe incomplet", d.stripe_no_details ?? 0, (d.stripe_no_details ?? 0) > 0],
      ["Stripe anormal", d.stripe_abnormal ?? 0, (d.stripe_abnormal ?? 0) > 0],
    ]);

    addSection("QR Codes", [
      ["Total QR", d.qr_total ?? 0],
      ["QR actifs", d.qr_active ?? 0],
      ["QR orphelins", d.qr_orphaned ?? 0, (d.qr_orphaned ?? 0) > 0],
    ]);

    addSection("Litiges", [
      ["Litiges ouverts", d.disputes_open, d.disputes_open > 0],
    ]);

    // Anomalies
    if (report.anomalies.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      y += 3;
      doc.setFillColor(254, 242, 242);
      const boxH = 10 + report.anomalies.length * 8;
      doc.roundedRect(15, y - 5, 180, boxH, 3, 3, "F");
      doc.setTextColor(153, 27, 27);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`Anomalies détectées (${report.anomalies.length})`, 20, y + 3);
      y += 12;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      report.anomalies.forEach((a) => {
        const icon = a.severity === "critical" ? "CRITIQUE" : "ATTENTION";
        doc.text(`[${icon}] ${a.message}`, 25, y);
        y += 8;
      });
    } else {
      if (y > 260) { doc.addPage(); y = 20; }
      y += 3;
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(15, y - 5, 180, 15, 3, 3, "F");
      doc.setTextColor(6, 95, 70);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Aucune anomalie — Tout est opérationnel", 105, y + 4, { align: "center" });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`SoloCab — Rapport généré le ${dateStr} — Page ${i}/${pageCount}`, 105, 285, { align: "center" });
    }

    doc.save(`rapport-sante-solocab-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF téléchargé");
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      ok: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      critical: "bg-red-500/10 text-red-600 border-red-500/20",
    };
    return (
      <Badge variant="outline" className={colors[status] || colors.warning}>
        {status === "ok" ? "✅ Opérationnel" : status === "warning" ? "⚠️ Attention" : "🚨 Critique"}
      </Badge>
    );
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "ok") return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    if (status === "warning") return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const d = healthData?.data;
  const unresolvedAlerts = alerts.filter(a => !a.is_resolved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Santé Plateforme</h2>
            {healthData && (
              <p className="text-xs text-muted-foreground">
                Dernière vérif: {new Date(healthData.checked_at).toLocaleString("fr-FR")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {healthData && <StatusBadge status={healthData.status} />}
          <Button onClick={() => generatePDF()} disabled={!healthData} size="sm" variant="outline" className="gap-1.5">
            <Download className="w-4 h-4" />
            PDF
          </Button>
          <Button onClick={sendDailyReport} disabled={sendingReport} size="sm" variant="secondary" className="gap-1.5">
            {sendingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Rapport quotidien
          </Button>
          <Button onClick={runHealthCheck} disabled={running} size="sm" className="gap-1.5">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Vérifier
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
        <Mail className="w-3.5 h-3.5 inline mr-1" />
        Rapport automatique chaque matin 7h (Paris). Boutons "Vérifier" (santé) et "Rapport quotidien" pour déclenchement manuel immédiat.
      </p>

      {/* Alerts */}
      {unresolvedAlerts.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              {unresolvedAlerts.length} alerte(s) non résolue(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unresolvedAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between bg-background/80 rounded-lg p-3 border border-red-500/10">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleString("fr-FR")}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)}>
                  Résoudre
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Anomalies */}
      {healthData?.anomalies && healthData.anomalies.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <Zap className="w-4 h-4" />
              Anomalies détectées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {healthData.anomalies.map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {a.severity === "critical" ? (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <span>{a.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Core Metrics */}
      {d && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Inscriptions aujourd'hui" value={d.inscriptions_today} sub={`Moy: ${d.inscriptions_avg_30d}`} icon={UserPlus} alert={d.inscriptions_avg_30d > 0 && d.inscriptions_today < d.inscriptions_avg_30d * 0.7} color="text-blue-600" bg="bg-blue-500/10" />
            <MetricCard label="Taux onboarding (7j)" value={`${d.onboarding_rate}%`} sub={`${d.onboarding_completed_7d}/${d.onboarding_total_7d}`} icon={TrendingUp} alert={d.onboarding_total_7d > 2 && d.onboarding_rate < 50} color="text-emerald-600" bg="bg-emerald-500/10" />
            <MetricCard label="Taux paiement OK" value={`${d.payment_success_rate}%`} sub={`${d.payments_failed_7d} échecs`} icon={CreditCard} alert={d.payments_total_7d > 5 && d.payment_success_rate < 90} color="text-violet-600" bg="bg-violet-500/10" />
            <MetricCard label="Courses aujourd'hui" value={d.courses_today} sub={`${d.courses_errors} erreurs`} icon={Car} alert={d.courses_errors > 0} color="text-indigo-600" bg="bg-indigo-500/10" />
          </div>

          {/* Funnel Onboarding */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-purple-500" />
                Funnel Onboarding (30j)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 flex-wrap text-xs">
                <FunnelStep label="Profil" count={d.funnel_step_profile ?? 0} color="bg-blue-500" />
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <FunnelStep label="Documents" count={d.funnel_step_documents ?? 0} color="bg-amber-500" />
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <FunnelStep label="Stripe" count={d.funnel_step_stripe ?? 0} color="bg-violet-500" />
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <FunnelStep label="Validation" count={d.funnel_step_review ?? 0} color="bg-emerald-500" />
              </div>
              <div className="flex gap-3 mt-3 text-xs">
                <span className="text-muted-foreground">
                  📄 Docs soumis: <b>{d.funnel_docs_submitted ?? 0}</b>
                </span>
                <span className={`${(d.funnel_docs_rejected ?? 0) > 0 ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                  ❌ Docs rejetés: <b>{d.funnel_docs_rejected ?? 0}</b>
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Stripe & QR detailed */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Chauffeurs actifs" value={d.active_drivers} icon={Users} color="text-emerald-600" bg="bg-emerald-500/10" />
            <MetricCard label="En attente" value={d.pending_drivers} icon={Clock} alert={d.pending_drivers > 5} color="text-amber-600" bg="bg-amber-500/10" />
            <MetricCard label="Conversion courses" value={`${d.conversion_rate_7d ?? 0}%`} sub={`${d.courses_completed_7d ?? 0} OK / ${d.courses_cancelled_7d ?? 0} annul.`} icon={TrendingUp} alert={(d.conversion_rate_7d ?? 100) < 50} color="text-blue-600" bg="bg-blue-500/10" />
            <MetricCard label="Courses bloquées" value={d.courses_stuck ?? 0} sub="+3h sans update" icon={Ban} alert={(d.courses_stuck ?? 0) > 0} color="text-red-600" bg="bg-red-500/10" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Sans Stripe" value={d.drivers_no_stripe} icon={Wallet} alert={d.drivers_no_stripe > 3} color="text-red-600" bg="bg-red-500/10" />
            <MetricCard label="Stripe sans payouts" value={d.stripe_no_payouts ?? 0} icon={FileWarning} alert={(d.stripe_no_payouts ?? 0) > 0} color="text-orange-600" bg="bg-orange-500/10" />
            <MetricCard label="QR actifs" value={d.qr_active ?? 0} sub={`${d.qr_total ?? 0} total`} icon={QrCode} color="text-teal-600" bg="bg-teal-500/10" />
            <MetricCard label="Litiges ouverts" value={d.disputes_open} icon={Shield} alert={d.disputes_open > 0} color="text-orange-600" bg="bg-orange-500/10" />
          </div>

          {/* Stripe/QR anomalies detail */}
          {((d.qr_orphaned ?? 0) > 0 || (d.stripe_abnormal ?? 0) > 0 || (d.stripe_no_details ?? 0) > 0) && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="py-3 space-y-1.5">
                {(d.qr_orphaned ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <QrCode className="w-4 h-4 shrink-0" />
                    <span>{d.qr_orphaned} QR codes actifs liés à des chauffeurs inactifs</span>
                  </div>
                )}
                {(d.stripe_abnormal ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{d.stripe_abnormal} chauffeurs avec statut Stripe anormal</span>
                  </div>
                )}
                {(d.stripe_no_details ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <FileWarning className="w-4 h-4 shrink-0" />
                    <span>{d.stripe_no_details} chauffeurs Stripe incomplet (détails non soumis)</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historique des vérifications</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucune vérification. Cliquez "Vérifier" pour lancer.
            </p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <StatusIcon status={log.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{log.status}</span>
                      <span className="text-xs text-muted-foreground">
                        {log.triggered_by.startsWith("admin") ? "🔧 Manuel" : "⚡ Auto"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.checked_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {log.anomalies && Array.isArray(log.anomalies) && log.anomalies.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {log.anomalies.length} anomalie(s)
                      </Badge>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => generatePDF({
                        status: log.status,
                        data: log.details,
                        anomalies: log.anomalies || [],
                        checked_at: log.checked_at,
                      })}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const FunnelStep = ({ label, count, color }: { label: string; count: number; color: string }) => (
  <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
    <div className={`w-2 h-2 rounded-full ${color}`} />
    <span className="font-medium">{label}</span>
    <span className="text-muted-foreground">({count})</span>
  </div>
);

const MetricCard = ({
  label, value, sub, icon: Icon, color, bg, alert
}: {
  label: string; value: string | number; sub?: string; icon: any; color: string; bg: string; alert?: boolean;
}) => (
  <Card className={`${alert ? "ring-1 ring-red-400/40 border-red-500/20" : "border-border/50"}`}>
    <CardContent className="p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`p-1 rounded-md ${bg}`}>
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
      </div>
      <div className="text-lg font-bold tracking-tight">{value}</div>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      {sub && <p className="text-[9px] text-muted-foreground/70 mt-0.5">{sub}</p>}
    </CardContent>
  </Card>
);

export default PlatformHealthDashboard;
