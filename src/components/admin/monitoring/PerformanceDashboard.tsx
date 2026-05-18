import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { performanceMonitor } from "@/lib/performanceMonitor";
import { Activity, RefreshCw, Zap, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const healthColors = {
  excellent: "bg-green-500",
  good: "bg-emerald-500",
  degraded: "bg-yellow-500",
  critical: "bg-red-500",
};

const healthLabels = {
  excellent: "Excellent",
  good: "Bon",
  degraded: "Dégradé",
  critical: "Critique",
};

export default function PerformanceDashboard() {
  const [apiStats, setApiStats] = useState<Record<string, { avg: number; p95: number; count: number; slow: boolean }>>({});
  const [navStats, setNavStats] = useState<{ route: string; avg: number; count: number }[]>([]);
  const [webVitals, setWebVitals] = useState<{ lcp?: number; fid?: number; cls?: number }>({});
  const [health, setHealth] = useState<'excellent' | 'good' | 'degraded' | 'critical'>('good');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setApiStats(performanceMonitor.getApiStats());
    setNavStats(performanceMonitor.getNavigationStats());
    setHealth(performanceMonitor.getOverallHealth());
    const vitals = await performanceMonitor.getWebVitals();
    setWebVitals(vitals);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const sortedApis = Object.entries(apiStats).sort((a, b) => b[1].avg - a[1].avg);
  const slowApis = sortedApis.filter(([, s]) => s.slow);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Performance Temps Réel</h2>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Health + Web Vitals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className={`w-3 h-3 rounded-full ${healthColors[health]} mx-auto mb-2`} />
            <p className="text-xs text-muted-foreground">Santé Globale</p>
            <p className="text-sm font-semibold">{healthLabels[health]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Zap className="h-4 w-4 mx-auto mb-2 text-primary" />
            <p className="text-xs text-muted-foreground">LCP</p>
            <p className="text-sm font-semibold">{webVitals.lcp ? `${webVitals.lcp}ms` : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-2 text-primary" />
            <p className="text-xs text-muted-foreground">CLS</p>
            <p className="text-sm font-semibold">{webVitals.cls !== undefined ? webVitals.cls : '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Activity className="h-4 w-4 mx-auto mb-2 text-primary" />
            <p className="text-xs text-muted-foreground">Endpoints</p>
            <p className="text-sm font-semibold">{sortedApis.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Slow APIs Alert */}
      {slowApis.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              {slowApis.length} API{slowApis.length > 1 ? 's' : ''} lente{slowApis.length > 1 ? 's' : ''} (&gt;500ms)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {slowApis.map(([name, stats]) => (
              <div key={name} className="flex justify-between text-xs">
                <span className="font-mono text-muted-foreground truncate max-w-[60%]">{name}</span>
                <Badge variant="destructive" className="text-xs">{stats.avg}ms</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* All APIs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Temps de Réponse API</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : sortedApis.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Utilisez l'app pour collecter des métriques...
            </p>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {sortedApis.map(([name, stats]) => (
                <div key={name} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                  <span className="font-mono truncate max-w-[40%]">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{stats.count}x</span>
                    <Badge variant={stats.avg < 300 ? "secondary" : stats.avg < 500 ? "outline" : "destructive"} className="text-xs min-w-[50px] text-center">
                      {stats.avg}ms
                    </Badge>
                    <span className="text-muted-foreground text-[10px]">p95: {stats.p95}ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Stats */}
      {navStats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Temps de Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {navStats.map(({ route, avg, count }) => (
                <div key={route} className="flex justify-between text-xs py-1">
                  <span className="font-mono truncate max-w-[60%]">{route}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{count}x</span>
                    <Badge variant={avg < 1500 ? "secondary" : "destructive"} className="text-xs">
                      {avg}ms
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Objectives */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Objectifs Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            {[
              { label: "Chargement page", target: "< 1.5s", achieved: !webVitals.lcp || webVitals.lcp < 1500 },
              { label: "API response", target: "< 300ms", achieved: Object.values(apiStats).every(s => s.avg < 300) },
              { label: "CLS (stabilité)", target: "< 0.1", achieved: !webVitals.cls || webVitals.cls < 0.1 },
              { label: "APIs lentes", target: "0", achieved: slowApis.length === 0 },
            ].map(({ label, target, achieved }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-muted-foreground">{label}</span>
                <div className="flex items-center gap-2">
                  <span>{target}</span>
                  <div className={`w-2 h-2 rounded-full ${achieved ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
