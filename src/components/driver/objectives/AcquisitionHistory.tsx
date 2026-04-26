import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Hand,
  QrCode,
  UserPlus,
  Car,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Sparkles,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DriverDailyEntry, DriverPlatform } from './types';

interface AcquisitionHistoryProps {
  entries: DriverDailyEntry[];
  platforms: DriverPlatform[];
}

type PeriodFilter = '7d' | '30d' | '90d' | 'all';
type ActionFilter = 'all' | 'cards' | 'scans' | 'signups' | 'courses';

interface AcquisitionAction {
  id: string;
  date: string;
  platformId: string | null;
  platformName: string;
  type: 'cards' | 'scans' | 'signups' | 'courses';
  count: number;
  /** Entrée brute pour l'analyse drill-down */
  entry: DriverDailyEntry;
}

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
  all: 'Tout l\'historique',
};

const ACTION_META: Record<
  ActionFilter,
  { label: string; icon: typeof Hand; color: string; bg: string; key?: keyof DriverDailyEntry }
> = {
  all: { label: 'Toutes actions', icon: Activity, color: 'text-foreground', bg: 'bg-muted' },
  cards: { label: 'Cartes proposées', icon: Hand, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', key: 'cards_proposed_count' as keyof DriverDailyEntry },
  scans: { label: 'Scans QR', icon: QrCode, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', key: 'qr_scans_count' as keyof DriverDailyEntry },
  signups: { label: 'Inscriptions', icon: UserPlus, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', key: 'direct_signups_count' as keyof DriverDailyEntry },
  courses: { label: 'Courses', icon: Car, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', key: 'courses_count' },
};

export function AcquisitionHistory({ entries, platforms }: AcquisitionHistoryProps) {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [action, setAction] = useState<ActionFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [selectedEntry, setSelectedEntry] = useState<DriverDailyEntry | null>(null);

  // Map plateforme id → nom
  const platformMap = useMemo(() => {
    const m = new Map<string, string>();
    platforms.forEach((p) => m.set(p.id, p.platform_name));
    return m;
  }, [platforms]);

  // Cutoff date
  const cutoffDate = useMemo(() => {
    if (period === 'all') return null;
    const d = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [period]);

  // Filtrer + transformer en actions
  const actions = useMemo<AcquisitionAction[]>(() => {
    const filtered = entries.filter((e) => {
      if (cutoffDate && new Date(e.entry_date) < cutoffDate) return false;
      if (platformFilter !== 'all') {
        if (platformFilter === 'solocab' && !e.is_solocab) return false;
        if (platformFilter !== 'solocab' && e.platform_id !== platformFilter) return false;
      }
      return true;
    });

    const out: AcquisitionAction[] = [];
    filtered.forEach((e) => {
      const platformName = e.is_solocab
        ? 'SoloCab'
        : (e.platform_id && platformMap.get(e.platform_id)) || 'Autre';

      const push = (type: AcquisitionAction['type'], count: number) => {
        if (count > 0) {
          out.push({
            id: `${e.id}-${type}`,
            date: e.entry_date,
            platformId: e.platform_id,
            platformName,
            type,
            count,
            entry: e,
          });
        }
      };

      if (action === 'all' || action === 'cards') push('cards', e.cards_proposed_count || 0);
      if (action === 'all' || action === 'scans') push('scans', e.qr_scans_count || 0);
      if (action === 'all' || action === 'signups') push('signups', e.direct_signups_count || 0);
      if (action === 'all' || action === 'courses') push('courses', e.courses_count || 0);
    });

    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [entries, cutoffDate, platformFilter, action, platformMap]);

  // Stats agrégées
  const stats = useMemo(() => {
    const totals = { cards: 0, scans: 0, signups: 0, courses: 0 };
    actions.forEach((a) => {
      totals[a.type] += a.count;
    });
    const propositionRate = totals.courses > 0 ? Math.round((totals.cards / totals.courses) * 100) : 0;
    const scanRate = totals.cards > 0 ? Math.round((totals.scans / totals.cards) * 100) : 0;
    const conversionRate = totals.scans > 0 ? Math.round((totals.signups / totals.scans) * 100) : 0;
    return { ...totals, propositionRate, scanRate, conversionRate };
  }, [actions]);

  // Comparaison période précédente
  const trend = useMemo(() => {
    if (period === 'all' || !cutoffDate) return null;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const prevCutoff = new Date(cutoffDate);
    prevCutoff.setDate(prevCutoff.getDate() - days);
    const prev = entries.filter((e) => {
      const d = new Date(e.entry_date);
      return d >= prevCutoff && d < cutoffDate;
    });
    const prevSignups = prev.reduce((s, e) => s + (e.direct_signups_count || 0), 0);
    const prevScans = prev.reduce((s, e) => s + (e.qr_scans_count || 0), 0);
    const signupsDelta = stats.signups - prevSignups;
    const scansDelta = stats.scans - prevScans;
    return { signupsDelta, scansDelta };
  }, [entries, cutoffDate, period, stats]);

  // Group by date pour rendu lisible
  const grouped = useMemo(() => {
    const map = new Map<string, AcquisitionAction[]>();
    actions.forEach((a) => {
      const arr = map.get(a.date) || [];
      arr.push(a);
      map.set(a.date, arr);
    });
    return Array.from(map.entries());
  }, [actions]);

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold">Historique d'acquisition</h3>
            </div>
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Filter className="w-3 h-3" />
              {actions.length} action{actions.length > 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Filtres */}
          <div className="grid grid-cols-3 gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger className="h-8 text-xs">
                <Calendar className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERIOD_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={action} onValueChange={(v) => setAction(v as ActionFilter)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ACTION_META) as ActionFilter[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {ACTION_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Toutes plateformes</SelectItem>
                <SelectItem value="solocab" className="text-xs">SoloCab</SelectItem>
                {platforms.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.platform_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-4 gap-1.5">
            <StatPill icon={<Hand className="w-3 h-3" />} value={stats.cards} label="Cartes" color="text-amber-600 dark:text-amber-400" />
            <StatPill icon={<QrCode className="w-3 h-3" />} value={stats.scans} label={`${stats.scanRate}%`} color="text-purple-600 dark:text-purple-400" />
            <StatPill icon={<UserPlus className="w-3 h-3" />} value={stats.signups} label={`${stats.conversionRate}%`} color="text-emerald-600 dark:text-emerald-400" />
            <StatPill icon={<Car className="w-3 h-3" />} value={stats.courses} label={`${stats.propositionRate}%`} color="text-blue-600 dark:text-blue-400" />
          </div>

          {/* Trend indicator */}
          {trend && (trend.signupsDelta !== 0 || trend.scansDelta !== 0) && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-t border-border pt-2">
              <span>vs période précédente :</span>
              <TrendBadge delta={trend.scansDelta} label="scans" />
              <TrendBadge delta={trend.signupsDelta} label="inscrits" />
            </div>
          )}

          {/* Timeline */}
          {grouped.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-2">
                <Sparkles className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Aucune action sur cette période. Commence par saisir tes courses pour suivre ton acquisition.
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[420px] -mx-4 px-4">
              <div className="space-y-3">
                {grouped.map(([date, dayActions]) => (
                  <div key={date} className="space-y-1.5">
                    <div className="flex items-center gap-2 sticky top-0 bg-card/95 backdrop-blur-sm py-1 z-10">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {format(new Date(date), 'EEEE d MMMM', { locale: fr })}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    {dayActions.map((a) => (
                      <ActionRow
                        key={a.id}
                        action={a}
                        onClick={() => setSelectedEntry(a.entry)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedEntry} onOpenChange={(o) => !o && setSelectedEntry(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          {selectedEntry && (
            <EntryDetail entry={selectedEntry} platformName={
              selectedEntry.is_solocab
                ? 'SoloCab'
                : (selectedEntry.platform_id && platformMap.get(selectedEntry.platform_id)) || 'Autre'
            } />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="rounded-lg bg-muted/30 border border-border/50 p-2 text-center">
      <div className={cn('flex items-center justify-center gap-1 mb-0.5', color)}>
        {icon}
        <span className="text-sm font-bold tabular-nums">{value}</span>
      </div>
      <p className="text-[9px] text-muted-foreground leading-none">{label}</p>
    </div>
  );
}

function TrendBadge({ delta, label }: { delta: number; label: string }) {
  if (delta === 0) return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Minus className="w-3 h-3" />
      {label}
    </span>
  );
  const positive = delta > 0;
  return (
    <span className={cn('flex items-center gap-1 font-medium', positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500')}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}{delta} {label}
    </span>
  );
}

function ActionRow({ action, onClick }: { action: AcquisitionAction; onClick: () => void }) {
  const meta = ACTION_META[action.type];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors text-left group"
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', meta.bg)}>
        <Icon className={cn('w-4 h-4', meta.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">+{action.count}</span>
          <span className="text-xs text-muted-foreground">{meta.label.toLowerCase()}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">via {action.platformName}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
    </button>
  );
}

function EntryDetail({ entry, platformName }: { entry: DriverDailyEntry; platformName: string }) {
  const propositionRate = entry.courses_count > 0 ? Math.round((entry.cards_proposed_count / entry.courses_count) * 100) : 0;
  const scanRate = entry.cards_proposed_count > 0 ? Math.round((entry.qr_scans_count / entry.cards_proposed_count) * 100) : 0;
  const conversionRate = entry.qr_scans_count > 0 ? Math.round((entry.direct_signups_count / entry.qr_scans_count) * 100) : 0;

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-base">
          {format(new Date(entry.entry_date), 'EEEE d MMMM yyyy', { locale: fr })}
        </SheetTitle>
        <SheetDescription className="flex items-center gap-2">
          <Badge variant="outline">{platformName}</Badge>
          {entry.is_solocab && (
            <Badge className="bg-primary/10 text-primary border-primary/20">Direct</Badge>
          )}
        </SheetDescription>
      </SheetHeader>

      <div className="mt-5 space-y-4">
        {/* KPIs principaux */}
        <div className="grid grid-cols-2 gap-2">
          <DetailKPI icon={<Car className="w-3.5 h-3.5 text-blue-500" />} label="Courses" value={entry.courses_count} />
          <DetailKPI icon={<TrendingUp className="w-3.5 h-3.5 text-green-500" />} label="CA" value={`${entry.revenue.toFixed(0)}€`} />
          <DetailKPI icon={<Hand className="w-3.5 h-3.5 text-amber-500" />} label="Cartes proposées" value={entry.cards_proposed_count} />
          <DetailKPI icon={<QrCode className="w-3.5 h-3.5 text-purple-500" />} label="Scans QR" value={entry.qr_scans_count} />
          <DetailKPI icon={<UserPlus className="w-3.5 h-3.5 text-emerald-500" />} label="Inscriptions" value={entry.direct_signups_count} />
          <DetailKPI icon={<Activity className="w-3.5 h-3.5 text-cyan-500" />} label="Heures" value={`${entry.hours_worked}h`} />
        </div>

        {/* Funnel rates */}
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Taux de conversion</h4>
          <RateLine label="Carte / course" value={propositionRate} />
          <RateLine label="Scan / carte" value={scanRate} />
          <RateLine label="Inscription / scan" value={conversionRate} />
        </div>

        {/* Notes */}
        {entry.notes && (
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</h4>
            <p className="text-xs text-foreground/80 whitespace-pre-line">{entry.notes}</p>
          </div>
        )}

        {/* Insight contextuel */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/90 leading-relaxed">
              {generateInsight({ propositionRate, scanRate, conversionRate, entry })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailKPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-base font-bold tabular-nums">{value}</p>
    </div>
  );
}

function RateLine({ label, value }: { label: string; value: number }) {
  const color = value >= 50 ? 'text-emerald-500' : value >= 25 ? 'text-amber-500' : 'text-orange-500';
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-bold tabular-nums', color)}>{value}%</span>
    </div>
  );
}

function generateInsight({
  propositionRate,
  scanRate,
  conversionRate,
  entry,
}: {
  propositionRate: number;
  scanRate: number;
  conversionRate: number;
  entry: DriverDailyEntry;
}): string {
  if (entry.courses_count === 0) return 'Pas de course ce jour-là.';
  if (propositionRate === 0 && entry.courses_count >= 3) {
    return `${entry.courses_count} courses ce jour mais aucune carte proposée. Chaque course = une opportunité ratée d'acquérir un client.`;
  }
  if (entry.direct_signups_count > 0) {
    return `🎉 ${entry.direct_signups_count} client${entry.direct_signups_count > 1 ? 's' : ''} acquis ce jour. Reproduit ce comportement : c'est exactement ce qui rend indépendant.`;
  }
  if (scanRate >= 50 && conversionRate < 30) {
    return 'Beaucoup de scans mais peu d\'inscriptions. Vérifie ton profil public — c\'est lui qui rassure et déclenche l\'inscription.';
  }
  if (propositionRate >= 80) {
    return 'Excellent taux de proposition. Continue, c\'est le levier n°1 de l\'indépendance.';
  }
  return 'Journée à analyser. Vise une carte proposée par course pour maximiser tes chances d\'acquisition.';
}
