import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Car,
  Hand,
  QrCode,
  UserPlus,
  Heart,
  Crown,
  TrendingUp,
  Info,
  Sparkles,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { DriverDailyEntry, DriverObjective } from './types';
import { AcquisitionTargetsQuickEdit } from './AcquisitionTargetsQuickEdit';

interface IndependenceFunnelProps {
  /** Période affichée par défaut */
  period?: 'daily' | 'weekly' | 'monthly';
  /** Toutes les entrées récentes pour calculer les agrégats */
  entries: DriverDailyEntry[];
  /** Objectifs pour la période active */
  objectives: DriverObjective[];
  /** Stats SoloCab pour la période (clients fidèles, CA direct) */
  soloCabStats?: {
    courses: number;
    revenue: number;
    clients: number;
  };
  /** Total clients directs accumulés (base de données chauffeur) */
  totalDirectClients: number;
  /** Combien sont fidèles (>= 2 courses directes) */
  loyalClientsCount: number;
  /** Pour le quick-edit inline des cibles */
  driverId?: string;
  onTargetsUpdated?: () => void;
}

const PERIOD_LABEL: Record<string, string> = {
  daily: "Aujourd'hui",
  weekly: 'Cette semaine',
  monthly: 'Ce mois',
};

/**
 * Funnel d'Indépendance — composant héros du dashboard chauffeur.
 *
 * Visualise le parcours de conversion : Courses → Propositions → Scans → Inscrits → Fidèles → CA récurrent.
 * L'objectif n'est PAS le CA, mais la construction d'une base clients qui rend le chauffeur indépendant.
 */
export function IndependenceFunnel({
  period = 'weekly',
  entries,
  objectives,
  soloCabStats,
  totalDirectClients,
  loyalClientsCount,
  driverId,
  onTargetsUpdated,
}: IndependenceFunnelProps) {
  const objective = useMemo(
    () => objectives.find((o) => o.period_type === period) || null,
    [objectives, period],
  );
  const monthlyObjective = useMemo(
    () => objectives.find((o) => o.period_type === 'monthly') || null,
    [objectives],
  );

  // Filtre des entrées sur la période
  const periodEntries = useMemo(() => {
    const now = new Date();
    const startOfPeriod = new Date(now);
    if (period === 'daily') {
      startOfPeriod.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // semaine commence le lundi
      startOfPeriod.setDate(now.getDate() - diff);
      startOfPeriod.setHours(0, 0, 0, 0);
    } else {
      startOfPeriod.setDate(1);
      startOfPeriod.setHours(0, 0, 0, 0);
    }
    return entries.filter((e) => new Date(e.entry_date) >= startOfPeriod);
  }, [entries, period]);

  // Agrégats funnel
  const totalCourses =
    periodEntries.reduce((sum, e) => sum + (e.courses_count || 0), 0) +
    (soloCabStats?.courses || 0);

  const cardsProposed = periodEntries.reduce(
    (sum, e) => sum + (e.cards_proposed_count || 0),
    0,
  );

  const qrScans = periodEntries.reduce(
    (sum, e) => sum + (e.qr_scans_count || 0),
    0,
  );

  const directSignups = periodEntries.reduce(
    (sum, e) => sum + (e.direct_signups_count || 0),
    0,
  );

  const directRevenue = soloCabStats?.revenue || 0;
  const externalRevenue = periodEntries
    .filter((e) => !e.is_solocab)
    .reduce((sum, e) => sum + (e.revenue || 0), 0);
  const totalRevenue = directRevenue + externalRevenue;
  const independencePct =
    totalRevenue > 0 ? Math.round((directRevenue / totalRevenue) * 100) : 0;

  // Taux de conversion
  const propositionRate = totalCourses > 0 ? Math.round((cardsProposed / totalCourses) * 100) : 0;
  const scanRate = cardsProposed > 0 ? Math.round((qrScans / cardsProposed) * 100) : 0;
  const signupRate = qrScans > 0 ? Math.round((directSignups / qrScans) * 100) : 0;

  // Punchline contextuelle
  const punchline = useMemo(() => {
    if (totalCourses === 0) {
      return "Démarre ta semaine en saisissant ta 1ʳᵉ course — chaque trajet est une opportunité d'indépendance.";
    }
    if (propositionRate < 30) {
      return `Tu as fait ${totalCourses} courses mais proposé ta carte ${cardsProposed} fois. Vise 1 proposition à chaque course — c'est ton vrai levier.`;
    }
    if (scanRate < 40 && cardsProposed >= 5) {
      return `${cardsProposed} cartes proposées, ${qrScans} scans. Un client sur deux scanne quand on lui montre — perfectionne ta phrase d'accroche.`;
    }
    if (directSignups >= 3) {
      return `+${directSignups} clients directs ${PERIOD_LABEL[period].toLowerCase()}. À ce rythme, dans 6 mois ta base sera autonome 👑`;
    }
    if (independencePct >= 50) {
      return `${independencePct}% de ton CA est en direct — tu n'es plus dépendant des plateformes, tu construis ton entreprise.`;
    }
    return `Chaque scan QR = 1 client à toi pour toujours. Continue, l'indépendance se construit course après course.`;
  }, [totalCourses, propositionRate, cardsProposed, qrScans, directSignups, independencePct, scanRate, period]);

  return (
    <Card id="independence-funnel" className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.03]">
      {/* Glow décoratif */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <CardContent className="p-4 sm:p-5 space-y-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <Crown className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Funnel d'Indépendance</h3>
              <p className="text-[11px] text-muted-foreground">{PERIOD_LABEL[period]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="gap-1 bg-primary/10 text-primary border-primary/20"
            >
              <Sparkles className="w-3 h-3" />
              {independencePct}% direct
            </Badge>
            {driverId && (
              <AcquisitionTargetsQuickEdit
                driverId={driverId}
                currentCardsTarget={monthlyObjective?.cards_proposed_target}
                currentScansTarget={monthlyObjective?.qr_scans_target}
                currentDirectClientsTarget={monthlyObjective?.direct_clients_target}
                currentIndependencePct={monthlyObjective?.independence_percentage_target}
                onSaved={onTargetsUpdated}
              />
            )}
          </div>
        </div>

        {/* Punchline */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          key={punchline}
          className="rounded-lg bg-primary/5 border border-primary/10 p-3"
        >
          <p className="text-xs leading-relaxed text-foreground/90">{punchline}</p>
        </motion.div>

        {/* Funnel steps */}
        <div className="space-y-2">
          <FunnelStep
            icon={Car}
            label="Courses totales"
            value={totalCourses}
            sublabel="Toutes plateformes confondues"
            color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            isFirst
          />

          <FunnelArrow rate={propositionRate} hint="Taux de proposition" />

          <FunnelStep
            icon={Hand}
            label="Cartes proposées"
            value={cardsProposed}
            sublabel={`${propositionRate}% de tes courses`}
            target={objective?.cards_proposed_target}
            color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            tooltip="À chaque course, propose ta carte SoloCab. C'est l'action n°1 pour devenir indépendant."
          />

          <FunnelArrow rate={scanRate} hint="Taux de scan" />

          <FunnelStep
            icon={QrCode}
            label="QR codes scannés"
            value={qrScans}
            sublabel={`${scanRate}% des cartes proposées`}
            target={objective?.qr_scans_target}
            color="bg-purple-500/10 text-purple-600 dark:text-purple-400"
            tooltip="Le scan = l'engagement initial. Si on te scanne, le client revient."
          />

          <FunnelArrow rate={signupRate} hint="Taux d'inscription" />

          <FunnelStep
            icon={UserPlus}
            label="Clients directs acquis"
            value={directSignups}
            sublabel={`${signupRate}% des scans transformés`}
            target={objective?.direct_clients_target}
            color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            tooltip="Chaque inscription = une chance qu'il te rappelle directement, sans commission."
          />

          <FunnelArrow hint="Conséquence" subtle />

          <FunnelStep
            icon={Heart}
            label="Clients fidèles (≥2 courses)"
            value={loyalClientsCount}
            sublabel={`Sur ${totalDirectClients} clients dans ta base`}
            color="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            tooltip="Un client fidèle vaut 10× un client unique. C'est lui qui te paie chaque mois."
          />

          <FunnelArrow hint="Résultat financier" subtle />

          <FunnelStep
            icon={TrendingUp}
            label="CA direct (sans commission)"
            value={`${directRevenue.toFixed(0)}€`}
            sublabel={
              totalRevenue > 0
                ? `${independencePct}% de ton CA total — Cible : ${objective?.independence_percentage_target || 50}%`
                : 'Lance-toi pour mesurer ton indépendance'
            }
            color="bg-primary/15 text-primary"
            isLast
            tooltip="Ce que tu gardes vraiment. Vise 50% pour ne plus jamais dépendre des plateformes."
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ============= Sous-composants =============

interface FunnelStepProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sublabel: string;
  target?: number;
  color: string;
  isFirst?: boolean;
  isLast?: boolean;
  tooltip?: string;
}

function FunnelStep({
  icon: Icon,
  label,
  value,
  sublabel,
  target,
  color,
  isFirst,
  isLast,
  tooltip,
}: FunnelStepProps) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;
  const progress = target && target > 0 ? Math.min(100, (numericValue / target) * 100) : null;

  const content = (
    <div
      className={cn(
        'flex items-center gap-3 p-2.5 rounded-lg border transition-all',
        isFirst && 'border-blue-500/20 bg-blue-500/5',
        isLast && 'border-primary/30 bg-primary/5 shadow-sm',
        !isFirst && !isLast && 'border-border/40 bg-background/50',
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          color,
        )}
      >
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium text-foreground/80 truncate">{label}</p>
          <span className="text-base font-bold tabular-nums shrink-0">{value}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-[10px] text-muted-foreground truncate">{sublabel}</p>
          {target ? (
            <span className="text-[10px] text-muted-foreground shrink-0">
              / {target}
            </span>
          ) : null}
        </div>
        {progress !== null && (
          <Progress value={progress} className="h-1 mt-1.5" />
        )}
      </div>
      {tooltip && (
        <Info className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
      )}
    </div>
  );

  if (!tooltip) return content;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="left" className="max-w-[240px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface FunnelArrowProps {
  rate?: number;
  hint?: string;
  subtle?: boolean;
}

function FunnelArrow({ rate, hint, subtle }: FunnelArrowProps) {
  const colorClass =
    rate === undefined
      ? 'text-muted-foreground/40'
      : rate >= 50
        ? 'text-emerald-500'
        : rate >= 25
          ? 'text-amber-500'
          : 'text-rose-500';

  return (
    <div className="flex items-center justify-center gap-2 py-0.5">
      <ArrowDown className={cn('w-3.5 h-3.5', subtle ? 'text-muted-foreground/30' : colorClass)} />
      {hint && (
        <span
          className={cn(
            'text-[10px] uppercase tracking-wide font-medium',
            subtle ? 'text-muted-foreground/50' : colorClass,
          )}
        >
          {hint}
          {rate !== undefined && ` ${rate}%`}
        </span>
      )}
      <ArrowDown className={cn('w-3.5 h-3.5', subtle ? 'text-muted-foreground/30' : colorClass)} />
    </div>
  );
}
