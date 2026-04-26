import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  X,
  TrendingUp,
  TrendingDown,
  Hand,
  QrCode,
  UserPlus,
  Crown,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DriverDailyEntry } from './types';
import type { ObjectiveSnapshot } from './hooks/useDriverAcquisitionMetrics';

interface MonthlyAcquisitionRecapProps {
  /** Toutes les entrées (idéalement 60 jours minimum pour comparer M et M-1) */
  entries: DriverDailyEntry[];
  /** Snapshots ordonnés desc par année/mois */
  snapshots: ObjectiveSnapshot[];
  /** Pour scroll vers le funnel */
  onSeeFunnel?: () => void;
}

const RECAP_DISMISSED_KEY = 'solocab_monthly_recap_dismissed';

interface MonthlyTotals {
  cards: number;
  scans: number;
  signups: number;
  courses: number;
}

function getYearMonth(d: Date): { year: number; month: number; key: string } {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return { year, month, key: `${year}-${String(month).padStart(2, '0')}` };
}

function aggregateMonth(entries: DriverDailyEntry[], year: number, month: number): MonthlyTotals {
  const target = entries.filter((e) => {
    const d = new Date(e.entry_date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  const sum = (k: keyof DriverDailyEntry) =>
    target.reduce((s, e) => s + (Number(e[k]) || 0), 0);
  return {
    cards: sum('cards_proposed_count' as keyof DriverDailyEntry),
    scans: sum('qr_scans_count' as keyof DriverDailyEntry),
    signups: sum('direct_signups_count' as keyof DriverDailyEntry),
    courses: sum('courses_count'),
  };
}

/**
 * Récap mensuel automatique — apparaît UNIQUEMENT du 1er au 7 d'un nouveau mois
 * si le mois précédent contient de l'activité ET n'a pas déjà été dismissé.
 *
 * Compare la performance vs cible snapshot (la cible qui était active sur le mois écoulé).
 * Si aucun snapshot pour M-1, on prend le snapshot le plus proche antérieur.
 */
export function MonthlyAcquisitionRecap({
  entries,
  snapshots,
  onSeeFunnel,
}: MonthlyAcquisitionRecapProps) {
  const [dismissed, setDismissed] = useState<string | null>(null);

  // Calcule M-1
  const { lastMonthYear, lastMonthMonth, lastMonthLabel, dismissKey, isWithinWindow } =
    useMemo(() => {
      const now = new Date();
      const dayOfMonth = now.getDate();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const ym = getYearMonth(prev);
      return {
        lastMonthYear: ym.year,
        lastMonthMonth: ym.month,
        lastMonthLabel: prev.toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric',
        }),
        dismissKey: `${RECAP_DISMISSED_KEY}_${ym.key}`,
        isWithinWindow: dayOfMonth <= 7, // visible 7 premiers jours du nouveau mois
      };
    }, []);

  useEffect(() => {
    try {
      const v = localStorage.getItem(dismissKey);
      if (v) setDismissed(dismissKey);
    } catch {
      /* noop */
    }
  }, [dismissKey]);

  const totals = useMemo(
    () => aggregateMonth(entries, lastMonthYear, lastMonthMonth),
    [entries, lastMonthYear, lastMonthMonth],
  );

  const previousTotals = useMemo(() => {
    const prev = new Date(lastMonthYear, lastMonthMonth - 2, 1);
    return aggregateMonth(entries, prev.getFullYear(), prev.getMonth() + 1);
  }, [entries, lastMonthYear, lastMonthMonth]);

  // Trouve le snapshot applicable au M-1 (le plus récent <= M-1)
  const applicableSnapshot = useMemo(() => {
    return snapshots.find((s) => {
      if (s.snapshot_year < lastMonthYear) return true;
      if (s.snapshot_year === lastMonthYear && s.snapshot_month <= lastMonthMonth) return true;
      return false;
    });
  }, [snapshots, lastMonthYear, lastMonthMonth]);

  if (!isWithinWindow) return null;
  if (dismissed) return null;
  if (totals.courses === 0) return null; // pas d'activité, rien à débriefer

  const handleDismiss = () => {
    try {
      localStorage.setItem(dismissKey, String(Date.now()));
    } catch {
      /* noop */
    }
    setDismissed(dismissKey);
  };

  // Comparaisons et taux
  const completion = (current: number, target: number) =>
    target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  const cardsPct = applicableSnapshot
    ? completion(totals.cards, applicableSnapshot.cards_proposed_target)
    : null;
  const scansPct = applicableSnapshot
    ? completion(totals.scans, applicableSnapshot.qr_scans_target)
    : null;
  const signupsPct = applicableSnapshot
    ? completion(totals.signups, applicableSnapshot.direct_clients_target)
    : null;

  const overall =
    cardsPct !== null && scansPct !== null && signupsPct !== null
      ? Math.round((cardsPct + scansPct + signupsPct) / 3)
      : null;

  const verdict = (() => {
    if (overall === null) return { label: 'Mois exploratoire', tone: 'neutral' as const };
    if (overall >= 100) return { label: 'Mois exceptionnel', tone: 'success' as const };
    if (overall >= 70) return { label: 'Mois solide', tone: 'good' as const };
    if (overall >= 40) return { label: 'Mois en progression', tone: 'medium' as const };
    return { label: 'Mois à relancer', tone: 'low' as const };
  })();

  const deltaSignups = totals.signups - previousTotals.signups;
  const deltaCards = totals.cards - previousTotals.cards;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5 relative">
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <CardContent className="p-4 relative">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                  <Trophy className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-bold leading-tight">Récap d'acquisition</h3>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {lastMonthLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Fermer le récap"
                className="p-1.5 rounded-md hover:bg-muted/60 -mr-1 -mt-1"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Verdict global */}
            <div
              className={cn(
                'rounded-lg p-3 mb-3 border',
                VERDICT_STYLES[verdict.tone].bg,
                VERDICT_STYLES[verdict.tone].border,
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide',
                    VERDICT_STYLES[verdict.tone].text,
                  )}
                >
                  {verdict.label}
                </span>
                {overall !== null && (
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] gap-1', VERDICT_STYLES[verdict.tone].badge)}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    {overall}% atteint
                  </Badge>
                )}
              </div>
              {applicableSnapshot ? (
                <p className="text-[11px] text-foreground/80 leading-relaxed">
                  {overall !== null && overall >= 70
                    ? "Tu construis une vraie base. Garde ce rythme et tu seras indépendant plus vite que prévu."
                    : "Le mois prochain, focalise-toi sur 1 levier en retard. Petits pas, gros résultats."}
                </p>
              ) : (
                <p className="text-[11px] text-foreground/80 leading-relaxed">
                  Pas de cible définie pour ce mois — on part d'une page blanche pour le suivant.
                </p>
              )}
            </div>

            {/* KPIs */}
            <div className="space-y-2.5 mb-3">
              <RecapRow
                icon={Hand}
                label="Cartes proposées"
                value={totals.cards}
                target={applicableSnapshot?.cards_proposed_target}
                pct={cardsPct}
                delta={deltaCards}
                color="text-amber-600 dark:text-amber-400"
              />
              <RecapRow
                icon={QrCode}
                label="Scans QR"
                value={totals.scans}
                target={applicableSnapshot?.qr_scans_target}
                pct={scansPct}
                delta={totals.scans - previousTotals.scans}
                color="text-purple-600 dark:text-purple-400"
              />
              <RecapRow
                icon={UserPlus}
                label="Clients directs"
                value={totals.signups}
                target={applicableSnapshot?.direct_clients_target}
                pct={signupsPct}
                delta={deltaSignups}
                color="text-emerald-600 dark:text-emerald-400"
                isHero
              />
            </div>

            {/* CTA */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
              <p className="text-[10px] text-muted-foreground">
                Mois en cours déjà entamé — fixe la barre plus haut 👑
              </p>
              {onSeeFunnel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSeeFunnel}
                  className="h-7 text-[11px] gap-1 px-2.5"
                >
                  Voir le funnel
                  <ArrowRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

interface RecapRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  target?: number;
  pct: number | null;
  delta: number;
  color: string;
  isHero?: boolean;
}

function RecapRow({ icon: Icon, label, value, target, pct, delta, color, isHero }: RecapRowProps) {
  const trendColor =
    delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-rose-500' : 'text-muted-foreground';
  const TrendIcon = delta >= 0 ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        'rounded-lg border p-2.5',
        isHero ? 'border-primary/30 bg-primary/5' : 'border-border/40 bg-background/40',
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={cn('w-4 h-4', color)} />
        <span className="text-xs font-medium flex-1">{label}</span>
        <span className="text-base font-bold tabular-nums">{value}</span>
        {target !== undefined && (
          <span className="text-[11px] text-muted-foreground">/ {target}</span>
        )}
      </div>
      {pct !== null && <Progress value={pct} className="h-1.5 mb-1" />}
      <div className="flex items-center justify-between text-[10px]">
        <div className={cn('flex items-center gap-1', trendColor)}>
          <TrendIcon className="w-2.5 h-2.5" />
          <span className="font-semibold">
            {delta > 0 ? '+' : ''}
            {delta}
          </span>
          <span className="text-muted-foreground">vs M-2</span>
        </div>
        {pct !== null && (
          <span className={cn('font-semibold', color)}>
            {pct}% de la cible
          </span>
        )}
      </div>
    </div>
  );
}

const VERDICT_STYLES: Record<
  'success' | 'good' | 'medium' | 'low' | 'neutral',
  { bg: string; border: string; text: string; badge: string }
> = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400',
  },
  good: {
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    text: 'text-primary',
    badge: 'border-primary/40 text-primary',
  },
  medium: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
  },
  low: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-600 dark:text-rose-400',
    badge: 'border-rose-500/40 text-rose-600 dark:text-rose-400',
  },
  neutral: {
    bg: 'bg-muted/40',
    border: 'border-border',
    text: 'text-muted-foreground',
    badge: 'border-border text-muted-foreground',
  },
};
