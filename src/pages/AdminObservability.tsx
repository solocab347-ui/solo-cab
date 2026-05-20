/**
 * Admin Observability Dashboard
 *
 * Tableau de bord minimal pour suivre la stabilité production:
 *  - reconnects Realtime, sockets zombies, erreurs de canal
 *  - pertes GPS (par type), chauffeurs forcés offline
 *  - latence courses (p50/p95/p99) par phase
 *  - erreurs critiques 24h
 *
 * Refresh manuel + auto toutes les 30 s.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Activity, MapPin, AlertTriangle, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LatencyRow {
  phase: string;
  sample_count: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  max_ms: number;
  avg_ms: number;
}

interface Summary {
  window_hours: number;
  generated_at: string;
  realtime: {
    reconnects: number;
    zombie_sockets: number;
    channel_errors: number;
    heartbeat_failed: number;
    missed_updates: number;
    app_resumes: number;
  };
  gps: {
    total_loss_events: number;
    forced_offline: number;
    watchdog_triggered: number;
    background_paused: number;
    foreground_service_lost: number;
    no_fix_timeout: number;
    low_accuracy: number;
    distinct_drivers: number;
  };
  courses_latency: LatencyRow[];
  critical_errors: number;
}

export default function AdminObservability() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(24);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('get_observability_summary' as any, { p_hours: hours });
      if (error) throw error;
      setData(data as unknown as Summary);
    } catch (e: any) {
      setError(e.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours]);

  const fmt = (n: number | null | undefined) =>
    n == null ? '—' : Math.round(n).toLocaleString('fr-FR');

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" /> Observabilité production
          </h1>
          <p className="text-sm text-muted-foreground">
            Fenêtre : {hours}h — généré {data ? new Date(data.generated_at).toLocaleTimeString('fr-FR') : '...'}
          </p>
        </div>
        <div className="flex gap-2">
          {[1, 6, 24, 72].map(h => (
            <Button key={h} size="sm" variant={hours === h ? 'default' : 'outline'} onClick={() => setHours(h)}>
              {h}h
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* KPI critiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Erreurs critiques"
          value={fmt(data?.critical_errors)}
          tone={data && data.critical_errors > 0 ? 'danger' : 'ok'}
        />
        <KpiCard
          icon={<Activity className="w-4 h-4" />}
          label="Sockets zombies"
          value={fmt(data?.realtime.zombie_sockets)}
          tone={data && data.realtime.zombie_sockets > 5 ? 'warn' : 'ok'}
        />
        <KpiCard
          icon={<MapPin className="w-4 h-4" />}
          label="Forcés offline (GPS)"
          value={fmt(data?.gps.forced_offline)}
          tone={data && data.gps.forced_offline > 3 ? 'warn' : 'ok'}
        />
        <KpiCard
          icon={<Clock className="w-4 h-4" />}
          label="Reconnects Realtime"
          value={fmt(data?.realtime.reconnects)}
          tone="info"
        />
      </div>

      {/* Realtime details */}
      <Card>
        <CardHeader><CardTitle>Realtime</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <Stat label="Reconnects" value={fmt(data?.realtime.reconnects)} />
          <Stat label="Zombies" value={fmt(data?.realtime.zombie_sockets)} />
          <Stat label="Erreurs canal" value={fmt(data?.realtime.channel_errors)} />
          <Stat label="Heartbeats KO" value={fmt(data?.realtime.heartbeat_failed)} />
          <Stat label="UPDATE manqués" value={fmt(data?.realtime.missed_updates)} />
          <Stat label="App resumes" value={fmt(data?.realtime.app_resumes)} />
        </CardContent>
      </Card>

      {/* GPS details */}
      <Card>
        <CardHeader><CardTitle>GPS chauffeurs</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <Stat label="Pertes totales" value={fmt(data?.gps.total_loss_events)} />
          <Stat label="Forcés offline" value={fmt(data?.gps.forced_offline)} />
          <Stat label="Watchdog" value={fmt(data?.gps.watchdog_triggered)} />
          <Stat label="Background pause" value={fmt(data?.gps.background_paused)} />
          <Stat label="Service perdu" value={fmt(data?.gps.foreground_service_lost)} />
          <Stat label="Sans fix > timeout" value={fmt(data?.gps.no_fix_timeout)} />
          <Stat label="Précision faible" value={fmt(data?.gps.low_accuracy)} />
          <Stat label="Chauffeurs distincts" value={fmt(data?.gps.distinct_drivers)} />
        </CardContent>
      </Card>

      {/* Latency table */}
      <Card>
        <CardHeader>
          <CardTitle>Latence courses (ms) — p50 / p95 / p99</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phase</TableHead>
                <TableHead className="text-right">N</TableHead>
                <TableHead className="text-right">p50</TableHead>
                <TableHead className="text-right">p95</TableHead>
                <TableHead className="text-right">p99</TableHead>
                <TableHead className="text-right">Max</TableHead>
                <TableHead className="text-right">Avg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.courses_latency ?? []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">
                  Aucune donnée de latence sur la fenêtre
                </TableCell></TableRow>
              )}
              {(data?.courses_latency ?? []).map(r => (
                <TableRow key={r.phase}>
                  <TableCell className="font-mono text-xs">{r.phase}</TableCell>
                  <TableCell className="text-right">{r.sample_count}</TableCell>
                  <TableCell className="text-right">{fmt(r.p50_ms)}</TableCell>
                  <TableCell className="text-right">{fmt(r.p95_ms)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={r.p99_ms > 5000 ? 'destructive' : 'secondary'}>{fmt(r.p99_ms)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{fmt(r.max_ms)}</TableCell>
                  <TableCell className="text-right">{fmt(r.avg_ms)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-2">
            Phases : <code>insert_to_received</code> · <code>received_to_overlay</code> ·{' '}
            <code>overlay_to_accept</code> · <code>accept_to_status</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon, label, value, tone = 'info',
}: { icon: React.ReactNode; label: string; value: string; tone?: 'ok' | 'warn' | 'danger' | 'info' }) {
  const toneClass = {
    ok: 'border-green-500/40',
    warn: 'border-yellow-500/40',
    danger: 'border-destructive/60',
    info: 'border-border',
  }[tone];
  return (
    <Card className={toneClass}>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/50 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}
