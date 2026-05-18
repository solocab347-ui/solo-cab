import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle, Activity, Clock, Zap, RefreshCw, TrendingUp,
  CheckCircle2, XCircle, Database, Cloud,
} from "lucide-react";

interface Metrics {
  generated_at: string;
  totals: {
    total_runs_1h: number;
    total_runs_24h: number;
    total_runs_7d: number;
    projected_monthly: number;
    http_calls_1h: number;
    http_errors_24h: number;
    active_jobs: number;
    total_jobs: number;
  };
  jobs: Array<{
    jobid: number; jobname: string | null; schedule: string; active: boolean; command: string;
  }>;
  runs_1h: Record<string, number>;
  runs_24h: Record<string, number>;
  runs_7d: Record<string, number>;
  top_jobs: Array<{
    jobid: number; jobname: string | null; schedule: string;
    runs_24h: number; failures_24h: number; avg_ms: number;
  }>;
  alerts: Array<{
    jobid: number; jobname: string | null;
    severity: "critical" | "high" | "medium";
    message: string; runs_24h: number;
  }>;
}

const severityColor: Record<string, string> = {
  critical: "bg-red-500/10 text-red-700 border-red-300",
  high: "bg-orange-500/10 text-orange-700 border-orange-300",
  medium: "bg-amber-500/10 text-amber-700 border-amber-300",
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

const CloudCostMonitor = () => {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const { data: res, error } = await supabase.rpc("get_cloud_cost_metrics" as any);
      if (error) throw error;
      setData(res as unknown as Metrics);
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 60_000); // auto-refresh 60s
    return () => clearInterval(i);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>{error || "Aucune donnée"}</AlertDescription>
      </Alert>
    );
  }

  const t = data.totals;
  const projected = t.projected_monthly;
  const projectionLevel =
    projected > 1_000_000 ? "critical" :
    projected > 300_000 ? "high" :
    projected > 100_000 ? "medium" : "ok";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600" />
            Coûts Lovable Cloud — Temps réel
          </h2>
          <p className="text-xs text-muted-foreground">
            Dernière mise à jour : {new Date(data.generated_at).toLocaleTimeString("fr-FR")}
            {" · auto-refresh 60s"}
          </p>
        </div>
        <Button onClick={load} disabled={refreshing} size="sm" variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((a, idx) => (
            <Alert key={idx} className={severityColor[a.severity] || ""}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="capitalize">
                {a.severity} — {a.jobname || `Job #${a.jobid}`}
              </AlertTitle>
              <AlertDescription>{a.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {data.alerts.length === 0 && (
        <Alert className="bg-emerald-500/10 text-emerald-700 border-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Aucune alerte</AlertTitle>
          <AlertDescription>Toutes les tâches sont sous les seuils de coût.</AlertDescription>
        </Alert>
      )}

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] text-muted-foreground uppercase">Exécutions 1h</span>
            </div>
            <div className="text-2xl font-bold">{fmt(t.total_runs_1h)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span className="text-[10px] text-muted-foreground uppercase">Exécutions 24h</span>
            </div>
            <div className="text-2xl font-bold">{fmt(t.total_runs_24h)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-purple-600" />
              <span className="text-[10px] text-muted-foreground uppercase">Exécutions 7j</span>
            </div>
            <div className="text-2xl font-bold">{fmt(t.total_runs_7d)}</div>
          </CardContent>
        </Card>
        <Card className={
          projectionLevel === "critical" ? "ring-2 ring-red-400" :
          projectionLevel === "high" ? "ring-2 ring-orange-400" :
          projectionLevel === "medium" ? "ring-1 ring-amber-400" : ""
        }>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              <span className="text-[10px] text-muted-foreground uppercase">Projection mensuelle</span>
            </div>
            <div className="text-2xl font-bold">{fmt(projected)}</div>
            <Badge variant="outline" className="mt-1 text-[10px]">
              {projectionLevel === "ok" ? "Bon" :
               projectionLevel === "medium" ? "À surveiller" :
               projectionLevel === "high" ? "Élevé" : "Critique"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="text-[10px] text-muted-foreground uppercase">Appels HTTP (net) 1h</span>
            </div>
            <div className="text-2xl font-bold">{fmt(t.http_calls_1h)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-[10px] text-muted-foreground uppercase">Erreurs HTTP 24h</span>
            </div>
            <div className="text-2xl font-bold">{fmt(t.http_errors_24h)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] text-muted-foreground uppercase">Tâches actives</span>
            </div>
            <div className="text-2xl font-bold">
              {t.active_jobs}<span className="text-sm text-muted-foreground">/{t.total_jobs}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top noisy jobs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Top 10 — Tâches les plus coûteuses (24h)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {data.top_jobs.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">Aucune exécution sur 24h.</p>
            )}
            {data.top_jobs.map((j) => {
              const projected = j.runs_24h * 30;
              const danger = j.runs_24h > 10000;
              return (
                <div key={j.jobid} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {j.jobname || `Job #${j.jobid}`}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex gap-3 mt-0.5">
                      <span><code className="bg-muted px-1 rounded">{j.schedule}</code></span>
                      <span>{j.avg_ms ?? 0} ms moy.</span>
                      {j.failures_24h > 0 && (
                        <span className="text-red-600">{j.failures_24h} échecs</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-bold ${danger ? "text-red-600" : ""}`}>
                      {fmt(j.runs_24h)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      ~{fmt(projected)}/mois
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* All jobs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Toutes les tâches planifiées ({data.jobs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y max-h-80 overflow-auto">
            {data.jobs.map((j) => (
              <div key={j.jobid} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {j.active ? "🟢" : "⚪"} {j.jobname || `#${j.jobid}`}
                  </div>
                  <code className="text-[10px] text-muted-foreground">{j.schedule}</code>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-muted-foreground">1h:</span>{" "}
                  <b>{fmt(data.runs_1h?.[j.jobid] || 0)}</b>
                  {" · "}
                  <span className="text-muted-foreground">24h:</span>{" "}
                  <b>{fmt(data.runs_24h?.[j.jobid] || 0)}</b>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CloudCostMonitor;
