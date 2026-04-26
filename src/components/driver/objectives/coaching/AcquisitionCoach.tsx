import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  AlertTriangle,
  Trophy,
  Lightbulb,
  X,
  ArrowRight,
  Bug,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { DriverDailyEntry } from '../types';
import {
  computeSignals,
  pickNudge,
  evaluateAllNudges,
  COACH_DISMISSED_KEY,
  COACH_LAST_SHOWN_KEY,
  COOLDOWN_MS,
  MAX_NUDGES_7D,
  type NudgeType,
} from './acquisitionCoachLogic';

/**
 * AcquisitionCoach — mentor non intrusif orienté acquisition de clients directs.
 *
 * Voir acquisitionCoachLogic.ts pour la logique pure (règles, signaux, picker).
 *
 * Props :
 *  - fullWidth : bord-à-bord (utile en mobile pour maximiser la lisibilité)
 *  - debug : affiche un panneau diagnostic listant toutes les règles
 */
interface AcquisitionCoachProps {
  entries: DriverDailyEntry[];
  totalDirectClients: number;
  loyalClientsCount: number;
  driverName?: string;
  onOpenQR?: () => void;
  /** Force le mode pleine largeur (sinon : auto sur mobile) */
  fullWidth?: boolean;
  /** Affiche un panneau debug en dessous (rules log) */
  debug?: boolean;
}

export function AcquisitionCoach({
  entries,
  totalDirectClients,
  loyalClientsCount,
  onOpenQR,
  fullWidth,
  debug = false,
}: AcquisitionCoachProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState(false);
  const [showDebug, setShowDebug] = useState(debug);
  const isMobile = useIsMobile();

  const useFullWidth = fullWidth ?? isMobile;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COACH_DISMISSED_KEY);
      if (raw) {
        const parsed: { id: string; ts: number }[] = JSON.parse(raw);
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recent = parsed.filter((d) => d.ts > cutoff);
        setDismissed(new Set(recent.map((d) => d.id)));
        if (recent.length !== parsed.length) {
          localStorage.setItem(COACH_DISMISSED_KEY, JSON.stringify(recent));
        }
      }
    } catch {}
  }, []);

  const signals = useMemo(() => computeSignals(entries), [entries]);

  const inCooldown = useMemo(() => {
    try {
      const last = localStorage.getItem(COACH_LAST_SHOWN_KEY);
      return !!(last && Date.now() - parseInt(last, 10) < COOLDOWN_MS);
    } catch {
      return false;
    }
  }, [dismissed]);

  const capReached = dismissed.size >= MAX_NUDGES_7D;

  const nudge = useMemo(() => {
    if (capReached || inCooldown) return null;
    return pickNudge(signals, totalDirectClients, loyalClientsCount, dismissed);
  }, [signals, totalDirectClients, loyalClientsCount, dismissed, capReached, inCooldown]);

  useEffect(() => {
    if (nudge && !hidden) {
      try {
        localStorage.setItem(COACH_LAST_SHOWN_KEY, Date.now().toString());
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudge?.id, hidden]);

  const handleDismiss = () => {
    if (!nudge) return;
    setHidden(true);
    setTimeout(() => {
      setDismissed((prev) => {
        const next = new Set(prev);
        next.add(nudge.id);
        try {
          const raw = localStorage.getItem(COACH_DISMISSED_KEY);
          const arr = raw ? JSON.parse(raw) : [];
          arr.push({ id: nudge.id, ts: Date.now() });
          localStorage.setItem(COACH_DISMISSED_KEY, JSON.stringify(arr));
        } catch {}
        return next;
      });
      setHidden(false);
    }, 250);
  };

  const handleCTA = () => {
    if (!nudge?.cta) return;
    if (nudge.cta.action === 'open-qr' && onOpenQR) onOpenQR();
    if (nudge.cta.action === 'open-funnel') {
      document.getElementById('independence-funnel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    handleDismiss();
  };

  const evaluations = useMemo(
    () =>
      evaluateAllNudges(
        signals,
        totalDirectClients,
        loyalClientsCount,
        dismissed,
        capReached,
        inCooldown,
      ),
    [signals, totalDirectClients, loyalClientsCount, dismissed, capReached, inCooldown],
  );

  // Render
  return (
    <>
      <AnimatePresence mode="wait">
        {nudge && !hidden && (
          <motion.div
            key={nudge.id}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={useFullWidth ? '-mx-3 sm:mx-0' : ''}
          >
            <NudgeCard
              nudge={nudge}
              compact={!isMobile}
              onCTA={handleCTA}
              onDismiss={handleDismiss}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug toggle (toujours dispo en dev, ou si prop debug=true) */}
      {(debug || import.meta.env.DEV) && (
        <button
          type="button"
          onClick={() => setShowDebug((v) => !v)}
          className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bug className="w-3 h-3" />
          {showDebug ? 'Masquer le diagnostic' : 'Diagnostic des nudges'}
        </button>
      )}

      {showDebug && (
        <CoachDebugPanel
          signals={signals}
          totalDirectClients={totalDirectClients}
          loyalClientsCount={loyalClientsCount}
          dismissedSize={dismissed.size}
          capReached={capReached}
          inCooldown={inCooldown}
          evaluations={evaluations}
        />
      )}
    </>
  );
}

// --- Carte du nudge (extraite pour pouvoir varier compact/full) ---
function NudgeCard({
  nudge,
  compact,
  onCTA,
  onDismiss,
}: {
  nudge: ReturnType<typeof pickNudge> & object;
  compact: boolean;
  onCTA: () => void;
  onDismiss: () => void;
}) {
  if (!nudge) return null;
  const styles = TYPE_STYLES[nudge.type as NudgeType];
  const Icon = styles.icon;

  return (
    <Card
      className={cn(
        'overflow-hidden border-2 relative',
        styles.border,
        styles.bg,
      )}
    >
      <CardContent className={compact ? 'p-3.5' : 'p-4'}>
        <div className={cn('flex items-start', compact ? 'gap-3' : 'gap-3.5')}>
          <div
            className={cn(
              'flex-shrink-0 rounded-full flex items-center justify-center',
              compact ? 'w-9 h-9' : 'w-11 h-11',
              styles.iconBg,
            )}
          >
            <Icon className={cn(compact ? 'w-4.5 h-4.5' : 'w-5 h-5', styles.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn('flex items-center gap-2', compact ? 'mb-1' : 'mb-1.5 flex-wrap')}>
              <h4 className={cn('font-semibold leading-tight', compact ? 'text-sm' : 'text-base')}>
                {nudge.title}
              </h4>
              <Badge
                variant="outline"
                className={cn(
                  'font-medium',
                  compact ? 'text-[9px] px-1.5 h-4' : 'text-[10px] px-2 h-5',
                  styles.badge,
                )}
              >
                {styles.label}
              </Badge>
            </div>
            <p
              className={cn(
                'text-muted-foreground leading-relaxed',
                compact ? 'text-xs' : 'text-sm',
              )}
            >
              {nudge.body}
            </p>
            {nudge.cta && (
              <Button
                size={compact ? 'sm' : 'default'}
                variant="outline"
                onClick={onCTA}
                className={cn(
                  'mt-3 gap-1.5 font-medium',
                  compact ? 'h-8 text-xs' : 'h-11 w-full sm:w-auto text-sm',
                )}
              >
                {nudge.cta.label}
                <ArrowRight className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
              </Button>
            )}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fermer"
            className={cn(
              'flex-shrink-0 rounded-md hover:bg-muted/60 active:bg-muted transition-colors touch-manipulation',
              compact ? '-mr-1 -mt-1 p-1' : 'p-2 -mr-1 -mt-1',
            )}
          >
            <X className={cn('text-muted-foreground', compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Panneau debug ---
function CoachDebugPanel({
  signals,
  totalDirectClients,
  loyalClientsCount,
  dismissedSize,
  capReached,
  inCooldown,
  evaluations,
}: {
  signals: ReturnType<typeof computeSignals>;
  totalDirectClients: number;
  loyalClientsCount: number;
  dismissedSize: number;
  capReached: boolean;
  inCooldown: boolean;
  evaluations: ReturnType<typeof evaluateAllNudges>;
}) {
  const reasonLabel: Record<typeof evaluations[number]['reason'], { label: string; color: string }> = {
    'shown': { label: '✓ AFFICHÉ', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
    'lower-priority': { label: 'Priorité plus basse', color: 'bg-muted text-muted-foreground border-border' },
    'condition-not-met': { label: 'Condition KO', color: 'bg-muted/50 text-muted-foreground border-border' },
    'already-dismissed': { label: 'Déjà fermé', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
    'cooldown': { label: 'Cooldown 4h', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
    'cap-reached': { label: 'Cap 8/7j atteint', color: 'bg-destructive/10 text-destructive border-destructive/30' },
  };

  return (
    <Card className="mt-2 border-dashed border-muted-foreground/30 bg-muted/20">
      <CardContent className="p-3 space-y-3 text-[11px]">
        <div className="flex items-center gap-1.5">
          <Bug className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">
            Diagnostic AcquisitionCoach
          </span>
        </div>

        {/* Signaux 7j */}
        <div>
          <div className="font-semibold mb-1.5">Signaux (7 derniers jours)</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono">
            <DebugRow k="courses (7j)" v={signals.courses7} />
            <DebugRow k="proposed (7j)" v={signals.proposed7} />
            <DebugRow k="scans (7j)" v={signals.scans7} />
            <DebugRow k="signups (7j)" v={signals.signups7} />
            <DebugRow k="courses (3j)" v={signals.courses3} />
            <DebugRow k="proposed (3j)" v={signals.proposed3} />
            <DebugRow k="taux propositions" v={`${Math.round(signals.proposalRate7 * 100)}%`} />
            <DebugRow k="taux scans" v={`${Math.round(signals.scanRate7 * 100)}%`} />
            <DebugRow k="taux conversion" v={`${Math.round(signals.conversionRate7 * 100)}%`} />
            <DebugRow k="clients directs" v={totalDirectClients} />
            <DebugRow k="clients fidèles" v={loyalClientsCount} />
          </div>
        </div>

        {/* État global */}
        <div>
          <div className="font-semibold mb-1.5">État du coach</div>
          <div className="flex flex-wrap gap-1.5">
            <StateBadge active={capReached} label={`Cap ${dismissedSize}/${MAX_NUDGES_7D}`} bad={capReached} />
            <StateBadge active={inCooldown} label="Cooldown 4h" bad={inCooldown} />
          </div>
        </div>

        {/* Liste des règles */}
        <div>
          <div className="font-semibold mb-1.5">Règles ({evaluations.length})</div>
          <div className="space-y-1.5">
            {evaluations.map((e) => {
              const r = reasonLabel[e.reason];
              return (
                <div
                  key={e.id}
                  className={cn(
                    'border rounded p-1.5 leading-tight',
                    e.reason === 'shown' ? r.color : 'border-border bg-background/50',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] text-muted-foreground">{e.id}</div>
                      <div className="font-medium text-[11px] truncate">{e.title}</div>
                    </div>
                    <Badge variant="outline" className={cn('text-[9px] px-1.5 h-4 shrink-0', r.color)}>
                      {r.label}
                    </Badge>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    if: {e.condition}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    values: {Object.entries(e.values).map(([k, v]) => `${k}=${v}`).join(', ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DebugRow({ k, v }: { k: string; v: number | string }) {
  return (
    <>
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </>
  );
}

function StateBadge({ active, label, bad }: { active: boolean; label: string; bad?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px]',
        active && bad && 'bg-destructive/10 text-destructive border-destructive/30',
        active && !bad && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
        !active && 'opacity-60',
      )}
    >
      {active ? '● ' : '○ '}
      {label}
    </Badge>
  );
}

const TYPE_STYLES: Record<
  NudgeType,
  {
    icon: typeof Sparkles;
    iconBg: string;
    iconColor: string;
    border: string;
    bg: string;
    badge: string;
    label: string;
  }
> = {
  celebration: {
    icon: Trophy,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-500',
    border: 'border-amber-500/40',
    bg: 'bg-gradient-to-br from-amber-500/5 to-transparent',
    badge: 'border-amber-500/40 text-amber-600 dark:text-amber-400',
    label: 'Bravo',
  },
  alert: {
    icon: AlertTriangle,
    iconBg: 'bg-orange-500/15',
    iconColor: 'text-orange-500',
    border: 'border-orange-500/40',
    bg: 'bg-gradient-to-br from-orange-500/5 to-transparent',
    badge: 'border-orange-500/40 text-orange-600 dark:text-orange-400',
    label: 'À surveiller',
  },
  opportunity: {
    icon: Sparkles,
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
    border: 'border-primary/40',
    bg: 'bg-gradient-to-br from-primary/5 to-transparent',
    badge: 'border-primary/40 text-primary',
    label: 'Opportunité',
  },
  tip: {
    icon: Lightbulb,
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-500',
    border: 'border-cyan-500/40',
    bg: 'bg-gradient-to-br from-cyan-500/5 to-transparent',
    badge: 'border-cyan-500/40 text-cyan-600 dark:text-cyan-400',
    label: 'Astuce',
  },
};
