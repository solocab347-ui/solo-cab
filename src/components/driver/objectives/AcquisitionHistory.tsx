import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Hand, QrCode, UserPlus, Calendar, Filter, ChevronRight, History as HistoryIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, subDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DriverDailyEntry, DriverPlatform } from './types';

interface Props {
  entries: DriverDailyEntry[];
  platforms: DriverPlatform[];
}

type Period = '7d' | '30d' | '90d' | 'all';
type ActionType = 'all' | 'cards' | 'scans' | 'signups';

interface ActionEvent {
  date: string;
  platformId: string | null;
  platformName: string;
  cards: number;
  scans: number;
  signups: number;
  notes: string | null;
  raw: DriverDailyEntry;
}

const PERIOD_LABEL: Record<Period, string> = {
  '7d': '7 derniers jours',
  '30d': '30 derniers jours',
  '90d': '90 derniers jours',
  'all': 'Tout',
};

const ACTION_LABEL: Record<ActionType, string> = {
  all: 'Toutes actions',
  cards: 'Cartes proposées',
  scans: 'Scans QR',
  signups: 'Inscriptions',
};

export function AcquisitionHistory({ entries, platforms }: Props) {
  const [period, setPeriod] = useState<Period>('30d');
  const [platformId, setPlatformId] = useState<string>('all');
  const [actionType, setActionType] = useState<ActionType>('all');
  const [selected, setSelected] = useState<ActionEvent | null>(null);

  const platformMap = useMemo(() => {
    const m = new Map<string, DriverPlatform>();
    platforms.forEach(p => m.set(p.id, p));
    return m;
  }, [platforms]);

  const filtered = useMemo<ActionEvent[]>(() => {
    const cutoff = period === 'all'
      ? null
      : startOfDay(subDays(new Date(), period === '7d' ? 7 : period === '30d' ? 30 : 90));

    return entries
      .filter(e => {
        if (cutoff) {
          try {
            if (parseISO(e.entry_date) < cutoff) return false;
          } catch {
            return false;
          }
        }
        if (platformId !== 'all') {
          if (platformId === 'solocab' && !e.is_solocab) return false;
          if (platformId !== 'solocab' && e.platform_id !== platformId) return false;
        }
        const cards = Number(e.cards_proposed_count) || 0;
        const scans = Number(e.qr_scans_count) || 0;
        const signups = Number(e.direct_signups_count) || 0;

        if (actionType === 'cards' && cards === 0) return false;
        if (actionType === 'scans' && scans === 0) return false;
        if (actionType === 'signups' && signups === 0) return false;
        if (actionType === 'all' && cards === 0 && scans === 0 && signups === 0) return false;

        return true;
      })
      .map(e => ({
        date: e.entry_date,
        platformId: e.platform_id,
        platformName: e.is_solocab
          ? 'SoloCab'
          : (e.platform_id ? platformMap.get(e.platform_id)?.platform_name || 'Plateforme' : '—'),
        cards: Number(e.cards_proposed_count) || 0,
        scans: Number(e.qr_scans_count) || 0,
        signups: Number(e.direct_signups_count) || 0,
        notes: e.notes,
        raw: e,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, period, platformId, actionType, platformMap]);

  const totals = useMemo(() => {
    const t = filtered.reduce(
      (acc, e) => ({
        cards: acc.cards + e.cards,
        scans: acc.scans + e.scans,
        signups: acc.signups + e.signups,
        courses: acc.courses + (Number(e.raw.courses_count) || 0),
      }),
      { cards: 0, scans: 0, signups: 0, courses: 0 },
    );
    return {
      ...t,
      proposalRate: t.courses > 0 ? t.cards / t.courses : null,
      scanRate: t.cards > 0 ? t.scans / t.cards : null,
      conversionRate: t.scans > 0 ? t.signups / t.scans : null,
    };
  }, [filtered]);

  // Warnings données manquantes (au niveau global, sur la sélection courante)
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (filtered.length > 0) {
      if (totals.courses === 0) w.push("Aucune course enregistrée → impossible de calculer le taux de proposition.");
      if (totals.cards === 0 && totals.courses > 0) w.push("0 carte proposée → taux de scan non calculable.");
      if (totals.scans === 0 && totals.cards > 0) w.push("0 scan → taux de conversion non calculable.");
    }
    return w;
  }, [filtered.length, totals]);

  return (
    <Card>
      <CardContent className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Historique d'acquisition</h3>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="h-9 text-xs">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABEL) as Period[]).map(p => (
                <SelectItem key={p} value={p} className="text-xs">{PERIOD_LABEL[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={platformId} onValueChange={setPlatformId}>
            <SelectTrigger className="h-9 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Toutes plateformes</SelectItem>
              <SelectItem value="solocab" className="text-xs">SoloCab</SelectItem>
              {platforms.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.platform_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ACTION_LABEL) as ActionType[]).map(a => (
                <SelectItem key={a} value={a} className="text-xs">{ACTION_LABEL[a]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Totaux */}
        <div className="grid grid-cols-3 gap-2">
          <TotalChip icon={<Hand className="w-3.5 h-3.5" />} label="Cartes" value={totals.cards} color="text-orange-600 dark:text-orange-400" bg="bg-orange-500/10" />
          <TotalChip icon={<QrCode className="w-3.5 h-3.5" />} label="Scans" value={totals.scans} color="text-blue-600 dark:text-blue-400" bg="bg-blue-500/10" />
          <TotalChip icon={<UserPlus className="w-3.5 h-3.5" />} label="Inscriptions" value={totals.signups} color="text-green-600 dark:text-green-400" bg="bg-green-500/10" />
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            Aucune action d'acquisition pour ces filtres.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[480px] overflow-y-auto -mx-1 px-1">
            {filtered.map((e, idx) => (
              <button
                key={`${e.date}-${e.platformId}-${idx}`}
                type="button"
                onClick={() => setSelected(e)}
                className="w-full text-left p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors touch-manipulation flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {safeFormatDate(e.date)}
                    </span>
                    <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                      {e.platformName}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {e.cards > 0 && <ActionPill icon={<Hand className="w-3 h-3" />} value={e.cards} color="text-orange-600 dark:text-orange-400" />}
                    {e.scans > 0 && <ActionPill icon={<QrCode className="w-3 h-3" />} value={e.scans} color="text-blue-600 dark:text-blue-400" />}
                    {e.signups > 0 && <ActionPill icon={<UserPlus className="w-3 h-3" />} value={e.signups} color="text-green-600 dark:text-green-400" />}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </CardContent>

      {/* Détail bottom-sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh]">
          <SheetHeader>
            <SheetTitle className="text-base">
              {selected ? safeFormatDate(selected.date, 'EEEE d MMMM yyyy') : ''}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{selected.platformName}</Badge>
                {selected.raw.is_solocab && (
                  <Badge className="text-xs bg-primary/15 text-primary border-primary/20">Course directe</Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <DetailStat icon={<Hand className="w-4 h-4" />} label="Cartes proposées" value={selected.cards} color="orange" />
                <DetailStat icon={<QrCode className="w-4 h-4" />} label="QR scannés" value={selected.scans} color="blue" />
                <DetailStat icon={<UserPlus className="w-4 h-4" />} label="Inscriptions" value={selected.signups} color="green" />
              </div>

              <div className="space-y-2 text-xs">
                <DetailLine label="Courses ce jour" value={selected.raw.courses_count} />
                <DetailLine label="Revenu ce jour" value={`${Number(selected.raw.revenue || 0).toFixed(2)} €`} />
                {selected.raw.hours_worked > 0 && (
                  <DetailLine label="Heures" value={`${selected.raw.hours_worked}h`} />
                )}
                <DetailLine
                  label="Taux de proposition"
                  value={selected.raw.courses_count > 0
                    ? `${Math.round((selected.cards / selected.raw.courses_count) * 100)}%`
                    : '—'}
                />
                <DetailLine
                  label="Taux de scan"
                  value={selected.cards > 0
                    ? `${Math.round((selected.scans / selected.cards) * 100)}%`
                    : '—'}
                />
                <DetailLine
                  label="Conversion scan → inscription"
                  value={selected.scans > 0
                    ? `${Math.round((selected.signups / selected.scans) * 100)}%`
                    : '—'}
                />
              </div>

              {selected.notes && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <p className="text-[11px] text-muted-foreground mb-1">Notes</p>
                  <p className="text-xs">{selected.notes}</p>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full h-10"
                onClick={() => setSelected(null)}
              >
                Fermer
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}

function TotalChip({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: number; color: string; bg: string }) {
  return (
    <div className={cn('rounded-lg px-2 py-1.5 flex items-center gap-1.5', bg)}>
      <span className={color}>{icon}</span>
      <div className="min-w-0">
        <div className={cn('text-sm font-bold tabular-nums leading-none', color)}>{value}</div>
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}

function ActionPill({ icon, value, color }: { icon: React.ReactNode; value: number; color: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium tabular-nums', color)}>
      {icon}{value}
    </span>
  );
}

function DetailStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'orange' | 'blue' | 'green' }) {
  const palette = {
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  }[color];
  return (
    <div className={cn('rounded-lg p-2.5 text-center', palette)}>
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-bold tabular-nums leading-none">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/40 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function safeFormatDate(d: string, fmt = 'dd MMM yyyy') {
  try {
    return format(parseISO(d), fmt, { locale: fr });
  } catch {
    return d;
  }
}
