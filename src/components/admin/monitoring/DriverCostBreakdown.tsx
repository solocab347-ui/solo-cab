import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, RefreshCw, Users, MapPin, Car, Zap,
  Database, DollarSign, TrendingUp,
} from "lucide-react";

interface Metrics {
  generated_at: string;
  active_drivers_24h: number;
  active_drivers_now: number;
  gps_writes_24h: number;
  courses_24h: number;
  edge_calls_24h: number;
  db_size_mb: number;
  avg_gps_per_driver: number;
  estimated_cost_per_driver_day_usd: number;
  estimated_cost_per_driver_month_usd: number;
  projected_monthly_cost_usd: number;
}

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

const DriverCostBreakdown = () => {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const { data: res, error } = await supabase.rpc("get_cost_per_user_metrics" as any);
      if (error) throw error;
      setData(res as unknown as Metrics);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh 5 min (was 60s on legacy dashboard — cost-conscious polling).
    const i = setInterval(load, 5 * 60_000);
    return () => clearInterval(i);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
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

  // GPS efficiency: theoretical max if no filter = ~4 050 writes / driver / 9h
  // Actual avg should be ~1 600 with the new filter active
  const theoreticalMax = 4050;
  const efficiencyPct = data.avg_gps_per_driver > 0
    ? Math.max(0, Math.round(100 - (data.avg_gps_per_driver / theoreticalMax) * 100))
    : 0;

  const efficiencyColor =
    efficiencyPct >= 50 ? "text-emerald-600" :
    efficiencyPct >= 25 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Coût par utilisateur — Temps réel
          </h2>
          <p className="text-xs text-muted-foreground">
            Maj : {new Date(data.generated_at).toLocaleTimeString("fr-FR")} · auto 5min
          </p>
        </div>
        <Button onClick={load} disabled={refreshing} size="sm" variant="outline" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Activité réelle */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] text-muted-foreground uppercase">Chauffeurs actifs 24h</span>
            </div>
            <div className="text-2xl font-bold">{fmt(data.active_drivers_24h)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {data.active_drivers_now} en ligne
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-purple-600" />
              <span className="text-[10px] text-muted-foreground uppercase">Écritures GPS 24h</span>
            </div>
            <div className="text-2xl font-bold">{fmt(data.gps_writes_24h)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {fmt(data.avg_gps_per_driver)} / chauffeur
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Car className="w-4 h-4 text-indigo-600" />
              <span className="text-[10px] text-muted-foreground uppercase">Courses 24h</span>
            </div>
            <div className="text-2xl font-bold">{fmt(data.courses_24h)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="text-[10px] text-muted-foreground uppercase">Edge calls 24h</span>
            </div>
            <div className="text-2xl font-bold">{fmt(data.edge_calls_24h)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Efficacité GPS filter */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Efficacité filtre GPS (skip si déplacement &lt; 10m)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className={`text-3xl font-bold ${efficiencyColor}`}>{efficiencyPct}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Économies vs sans filtre (~{fmt(theoreticalMax)} writes/chauffeur théorique sur 9h)
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className={efficiencyColor}>
                {efficiencyPct >= 50 ? "Excellent" : efficiencyPct >= 25 ? "Correct" : "À surveiller"}
              </Badge>
            </div>
          </div>
          <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
              style={{ width: `${Math.min(100, efficiencyPct)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Coûts estimés */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Estimations Lovable Cloud
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-[10px] text-muted-foreground uppercase">Coût / chauffeur / jour</div>
            <div className="text-2xl font-bold mt-1">
              {fmtUsd(data.estimated_cost_per_driver_day_usd)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-[10px] text-muted-foreground uppercase">Coût / chauffeur / mois</div>
            <div className="text-2xl font-bold mt-1">
              {fmtUsd(data.estimated_cost_per_driver_month_usd)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">22 jours travaillés</div>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border">
            <div className="text-[10px] text-muted-foreground uppercase">Projection mensuelle totale</div>
            <div className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">
              {fmtUsd(data.projected_monthly_cost_usd)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              + infra (~$25) inclus
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DB size */}
      <Card>
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium">Taille base de données</span>
          </div>
          <span className="text-lg font-bold">{fmt(data.db_size_mb)} MB</span>
        </CardContent>
      </Card>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-xs">Méthodologie</AlertTitle>
        <AlertDescription className="text-xs">
          Estimation basée sur : GPS writes ($0.000005/u) + edge calls ($0.0001/u) + base infra
          ($0.005/chauffeur/jour). Modèle conservateur, valeurs réelles ±15%.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default DriverCostBreakdown;
