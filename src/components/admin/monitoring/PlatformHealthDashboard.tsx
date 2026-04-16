import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Users, Car, CreditCard, Shield, TrendingUp, Loader2,
  Clock, Zap, UserPlus, Wallet
} from "lucide-react";

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
        // Use most recent log as current health data
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
      const { data, error } = await supabase.rpc("run_platform_health_check", {
        p_triggered_by: "admin_manual",
      });
      if (error) throw error;
      setHealthData(data as unknown as HealthData);
      toast.success("Vérification terminée");
      await loadData();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    } finally {
      setRunning(false);
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

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "ok") return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    if (status === "warning") return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
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
      {/* Header + Status */}
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
        <div className="flex items-center gap-2">
          {healthData && <StatusBadge status={healthData.status} />}
          <Button onClick={runHealthCheck} disabled={running} size="sm" className="gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Vérifier maintenant
          </Button>
        </div>
      </div>

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
                <div>
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

      {/* Current anomalies */}
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

      {/* Key metrics */}
      {d && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Inscriptions aujourd'hui"
              value={d.inscriptions_today}
              sub={`Moy 30j: ${d.inscriptions_avg_30d}`}
              icon={UserPlus}
              alert={d.inscriptions_avg_30d > 0 && d.inscriptions_today < d.inscriptions_avg_30d * 0.7}
              color="text-blue-600" bg="bg-blue-500/10"
            />
            <MetricCard
              label="Taux onboarding (7j)"
              value={`${d.onboarding_rate}%`}
              sub={`${d.onboarding_completed_7d}/${d.onboarding_total_7d}`}
              icon={TrendingUp}
              alert={d.onboarding_total_7d > 2 && d.onboarding_rate < 50}
              color="text-emerald-600" bg="bg-emerald-500/10"
            />
            <MetricCard
              label="Taux paiement OK (7j)"
              value={`${d.payment_success_rate}%`}
              sub={`${d.payments_failed_7d} échecs`}
              icon={CreditCard}
              alert={d.payments_total_7d > 5 && d.payment_success_rate < 90}
              color="text-violet-600" bg="bg-violet-500/10"
            />
            <MetricCard
              label="Courses aujourd'hui"
              value={d.courses_today}
              sub={`${d.courses_errors} erreurs`}
              icon={Car}
              alert={d.courses_errors > 0}
              color="text-indigo-600" bg="bg-indigo-500/10"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Chauffeurs actifs"
              value={d.active_drivers}
              icon={Users}
              color="text-emerald-600" bg="bg-emerald-500/10"
            />
            <MetricCard
              label="En attente validation"
              value={d.pending_drivers}
              icon={Clock}
              alert={d.pending_drivers > 5}
              color="text-amber-600" bg="bg-amber-500/10"
            />
            <MetricCard
              label="Sans Stripe"
              value={d.drivers_no_stripe}
              icon={Wallet}
              alert={d.drivers_no_stripe > 3}
              color="text-red-600" bg="bg-red-500/10"
            />
            <MetricCard
              label="Litiges ouverts"
              value={d.disputes_open}
              icon={Shield}
              alert={d.disputes_open > 0}
              color="text-orange-600" bg="bg-orange-500/10"
            />
          </div>
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
              Aucune vérification effectuée. Cliquez sur "Vérifier maintenant".
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
                  {log.anomalies && Array.isArray(log.anomalies) && log.anomalies.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {log.anomalies.length} anomalie(s)
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

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
