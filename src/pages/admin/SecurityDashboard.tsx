/**
 * Admin Security Dashboard
 *
 * Vague 2 — Détection & Monitoring.
 * Agrège alertes sécurité, anomalies GPS, IPs bloquées, fraude client
 * et événements d'audit via la RPC `get_security_overview`.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Shield, MapPin, Ban, AlertTriangle, ScrollText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Overview {
  window_hours: number;
  generated_at: string;
  alerts: {
    open_total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    recent: Array<{ id: string; type: string; severity: string; title: string; created_at: string; resolved: boolean }>;
  };
  gps_anomalies: {
    count: number;
    critical: number;
    high: number;
    recent: Array<{ id: string; driver_id: string | null; type: string; severity: string; speed: number | null; jump_m: number | null; mock: boolean; created_at: string }>;
  };
  blocked_ips: { total: number; recent: Array<{ ip: string; reason: string; created_at: string }> };
  client_fraud: { count: number; recent: Array<{ id: string; client_id: string; flag_type: string; severity: string; created_at: string }> };
  audit: { count: number; recent: Array<{ id: string; action: string; actor: string | null; target: string | null; entity_type: string | null; created_at: string }> };
}

const sevColor = (s: string) =>
  s === 'critical' ? 'destructive' : s === 'high' ? 'destructive' : s === 'medium' ? 'default' : 'secondary';

export default function SecurityDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(24);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_security_overview', { _hours: hours });
    setLoading(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    setData(data as unknown as Overview);
  }, [hours]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-7xl">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Sécurité — Centre de contrôle</h1>
        </div>
        <div className="flex items-center gap-2">
          {[1, 24, 168].map((h) => (
            <Button key={h} size="sm" variant={hours === h ? 'default' : 'outline'} onClick={() => setHours(h)}>
              {h === 1 ? '1h' : h === 24 ? '24h' : '7j'}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Alertes ouvertes" value={data?.alerts.open_total ?? 0} sub={`${data?.alerts.critical ?? 0} critiques · ${data?.alerts.high ?? 0} hautes`} />
        <Stat icon={<MapPin className="h-4 w-4" />} label="Anomalies GPS" value={data?.gps_anomalies.count ?? 0} sub={`${data?.gps_anomalies.critical ?? 0} critiques`} />
        <Stat icon={<Ban className="h-4 w-4" />} label="IPs bloquées" value={data?.blocked_ips.total ?? 0} />
        <Stat icon={<ScrollText className="h-4 w-4" />} label="Audit (events)" value={data?.audit.count ?? 0} />
      </div>

      <Section title="Alertes sécurité récentes" empty="Aucune alerte sur la période.">
        {data?.alerts.recent?.length ? (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Sévérité</TableHead><TableHead>Titre</TableHead><TableHead>État</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {data.alerts.recent.slice(0, 30).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{new Date(a.created_at).toLocaleString('fr-FR')}</TableCell>
                  <TableCell><code className="text-xs">{a.type}</code></TableCell>
                  <TableCell><Badge variant={sevColor(a.severity) as never}>{a.severity}</Badge></TableCell>
                  <TableCell className="text-sm">{a.title}</TableCell>
                  <TableCell>{a.resolved ? <Badge variant="outline">résolu</Badge> : <Badge variant="destructive">ouvert</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </Section>

      <Section title="Anomalies GPS" empty="Aucune anomalie détectée.">
        {data?.gps_anomalies.recent?.length ? (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead>Chauffeur</TableHead><TableHead>Type</TableHead><TableHead>Sév.</TableHead><TableHead>Vitesse</TableHead><TableHead>Saut</TableHead><TableHead>Mock</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {data.gps_anomalies.recent.slice(0, 30).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{new Date(a.created_at).toLocaleString('fr-FR')}</TableCell>
                  <TableCell className="font-mono text-xs">{a.driver_id?.slice(0, 8) ?? '—'}</TableCell>
                  <TableCell><code className="text-xs">{a.type}</code></TableCell>
                  <TableCell><Badge variant={sevColor(a.severity) as never}>{a.severity}</Badge></TableCell>
                  <TableCell className="text-xs">{a.speed ? `${Math.round(a.speed)} km/h` : '—'}</TableCell>
                  <TableCell className="text-xs">{a.jump_m ? `${Math.round(a.jump_m)} m` : '—'}</TableCell>
                  <TableCell>{a.mock ? <Badge variant="destructive">oui</Badge> : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="IPs bloquées" empty="Aucune IP bloquée.">
          {data?.blocked_ips.recent?.length ? (
            <ul className="space-y-1 text-sm">
              {data.blocked_ips.recent.slice(0, 20).map((b, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="font-mono">{b.ip}</span>
                  <span className="text-muted-foreground text-xs truncate">{b.reason}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section title="Fraude client" empty="Aucun signalement.">
          {data?.client_fraud.recent?.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Sév.</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.client_fraud.recent.slice(0, 20).map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs">{new Date(f.created_at).toLocaleString('fr-FR')}</TableCell>
                    <TableCell><code className="text-xs">{f.flag_type}</code></TableCell>
                    <TableCell><Badge variant={sevColor(f.severity) as never}>{f.severity}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </Section>
      </div>

      <Section title="Audit log (actions sensibles)" empty="Aucune action sensible.">
        {data?.audit.recent?.length ? (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Action</TableHead><TableHead>Acteur</TableHead><TableHead>Cible</TableHead><TableHead>Entité</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.audit.recent.slice(0, 30).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{new Date(a.created_at).toLocaleString('fr-FR')}</TableCell>
                  <TableCell><code className="text-xs">{a.action}</code></TableCell>
                  <TableCell className="font-mono text-xs">{a.actor?.slice(0, 8) ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{a.target?.slice(0, 8) ?? '—'}</TableCell>
                  <TableCell className="text-xs">{a.entity_type ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </Section>

      {data && (
        <p className="text-xs text-muted-foreground">
          Fenêtre {data.window_hours}h · Généré {new Date(data.generated_at).toLocaleTimeString('fr-FR')}
        </p>
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">{icon}{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = !!children && (Array.isArray(children) ? children.length > 0 : true);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {hasChildren ? children : <p className="text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
}
