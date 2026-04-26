import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  TrendingDown,
  Target,
  ArrowRight,
  X,
  Hand,
  QrCode,
  UserPlus,
  Crown,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DriverDailyEntry, DriverObjective } from './types';

/**
 * AcquisitionAlerts — alertes seuils basées sur les cibles définies.
 *
 * Différent de AcquisitionCoach (qui est éducatif & contextuel) :
 * ici on compare les performances réelles à la cible mensuelle et on alerte
 * dès qu'un KPI est en dessous d'un seuil critique avec une recommandation
 * actionnable précise ("Propose 4 cartes/jour pendant 5 jours pour rattraper").
 *
 * Apparaît uniquement quand le mois est >= 30% écoulé (sinon trop tôt pour juger).
 * Affiche au max 2 alertes simultanées (les plus critiques).
 */

const ALERTS_DISMISSED_KEY = 'solocab_acq_alerts_dismissed';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

type AlertSeverity = 'critical' | 'warning' | 'info';

interface ThresholdAlert {
  id: string;
  severity: AlertSeverity;
  icon: typeof Hand;
  title: string;
  diagnostic: string;
  recommendation: string;
  current: number;
  target: number;
  unit: string;
  /** Action concrète conseillée pour rattraper */
  actionPlan: string;
  scrollTo?: string;
}

interface AcquisitionAlertsProps {
  entries: DriverDailyEntry[];
  objectives: DriverObjective[];
  totalDirectClients: number;
  /** % du CA déjà fait en direct ce mois */
  currentIndependencePct: number;
}

function daysElapsedInMonth() {
  const now = new Date();
  const day = now.getDate();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return { day, lastDay, ratio: day / lastDay };
}

function buildAlerts(
  entries: DriverDailyEntry[],
  monthlyObj: DriverObjective | undefined,
  totalDirectClients: number,
  currentIndependencePct: number,
): ThresholdAlert[] {
  if (!monthlyObj) return [];

  const { day, lastDay, ratio } = daysElapsedInMonth();
  // Trop tôt dans le mois pour juger
  if (ratio < 0.3) return [];

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthEntries = entries.filter((e) => new Date(e.entry_date) >= startOfMonth);

  const sum = (key: keyof DriverDailyEntry) =>
    monthEntries.reduce((s, e) => s + (Number(e[key]) || 0), 0);

  const cards = sum('cards_proposed_count' as keyof DriverDailyEntry);
  const scans = sum('qr_scans_count' as keyof DriverDailyEntry);
  const signups = sum('direct_signups_count' as keyof DriverDailyEntry);
  const courses = sum('courses_count' as keyof DriverDailyEntry);

  const alerts: ThresholdAlert[] = [];
  const remainingDays = Math.max(1, lastDay - day);

  // Helper : seuil = (cible × ratio temps écoulé) × 0.7  (warning) ou × 0.5 (critical)
  const evaluate = (
    id: string,
    icon: typeof Hand,
    label: string,
    current: number,
    target: number,
    unit: string,
    actionTemplate: (gap: number, perDay: number) => string,
    scrollTo?: string,
  ) => {
    if (target <= 0) return;
    const expected = target * ratio;
    const gap = Math.max(0, target - current);
    const perDay = Math.ceil(gap / remainingDays);
    const completion = current / target;
    const expectedCompletion = ratio;

    if (completion < expectedCompletion * 0.5) {
      alerts.push({
        id,
        severity: 'critical',
        icon,
        title: `${label} : tu es très en retard`,
        diagnostic: `${current} / ${target} (au lieu de ~${Math.round(expected)} attendus à ce stade du mois)`,
        recommendation: actionTemplate(gap, perDay),
        current,
        target,
        unit,
        actionPlan: `Vise ${perDay} ${unit}/jour pendant ${remainingDays}j`,
        scrollTo,
      });
    } else if (completion < expectedCompletion * 0.7) {
      alerts.push({
        id,
        severity: 'warning',
        icon,
        title: `${label} : retard à rattraper`,
        diagnostic: `${current} / ${target} — il manque ${gap} ${unit} sur ${remainingDays}j`,
        recommendation: actionTemplate(gap, perDay),
        current,
        target,
        unit,
        actionPlan: `${perDay} ${unit}/jour suffit pour rattraper`,
        scrollTo,
      });
    }
  };

  // 1. Cartes proposées
  evaluate(
    'thr-cards',
    Hand,
    'Cartes proposées',
    cards,
    monthlyObj.cards_proposed_target,
    'cartes',
    (gap, perDay) =>
      `À chaque course, dis simplement « si vous voulez me reprendre directement, scannez ». ${perDay} cartes/jour, c'est faisable même en faisant 6-8 courses.`,
    'independence-funnel',
  );

  // 2. Scans QR — alerte uniquement si on a déjà des cartes proposées
  if (cards > 0) {
    const scanRate = scans / cards;
    if (scanRate < 0.3 && cards >= 10) {
      alerts.push({
        id: 'thr-scan-rate',
        severity: scanRate < 0.15 ? 'critical' : 'warning',
        icon: QrCode,
        title: 'Taux de scan trop bas',
        diagnostic: `${Math.round(scanRate * 100)}% des cartes proposées sont scannées (objectif : 50%)`,
        recommendation:
          'Pose ta carte sur le siège passager AVANT la course. Quand tu en parles à la fin, le client la voit déjà.',
        current: Math.round(scanRate * 100),
        target: 50,
        unit: '%',
        actionPlan: 'Vérifie la position de ta carte + reformule ton accroche',
        scrollTo: 'independence-funnel',
      });
    }
    evaluate(
      'thr-scans',
      QrCode,
      'Scans QR',
      scans,
      monthlyObj.qr_scans_target,
      'scans',
      (gap, perDay) =>
        `Affiche ton QR de manière plus visible (porte-vue, écran arrière). ${perDay} scans/jour = simplement plus de visibilité physique.`,
      'independence-funnel',
    );
  }

  // 3. Conversion scans → inscriptions
  if (scans >= 5) {
    const conversionRate = signups / scans;
    if (conversionRate < 0.3) {
      alerts.push({
        id: 'thr-conversion',
        severity: conversionRate < 0.1 ? 'critical' : 'warning',
        icon: UserPlus,
        title: 'Conversion scan → inscription faible',
        diagnostic: `${signups} inscrits sur ${scans} scans (${Math.round(conversionRate * 100)}%)`,
        recommendation:
          "Ton profil public manque sûrement d'infos qui rassurent. Photo nette + bio courte + véhicule renseigné = +60% de conversion.",
        current: Math.round(conversionRate * 100),
        target: 50,
        unit: '%',
        actionPlan: 'Complète ton profil public dans Paramètres → Profil',
      });
    }
  }

  // 4. Clients directs
  evaluate(
    'thr-clients',
    UserPlus,
    'Clients directs',
    signups,
    monthlyObj.direct_clients_target,
    'clients',
    (_gap, perDay) =>
      `Concentre-toi sur la qualité du contact : un client qui s'inscrit après une bonne course revient. ${perDay}/jour = très accessible.`,
    'independence-funnel',
  );

  // 5. Indépendance % CA
  if (
    monthlyObj.independence_percentage_target > 0 &&
    currentIndependencePct < monthlyObj.independence_percentage_target * 0.7 &&
    courses >= 20 // au moins une activité significative
  ) {
    const gap = monthlyObj.independence_percentage_target - currentIndependencePct;
    alerts.push({
      id: 'thr-independence',
      severity: currentIndependencePct < monthlyObj.independence_percentage_target * 0.4 ? 'critical' : 'warning',
      icon: Crown,
      title: 'Indépendance sous la cible',
      diagnostic: `${currentIndependencePct}% de CA direct vs cible ${monthlyObj.independence_percentage_target}%`,
      recommendation:
        "L'indépendance se gagne en réactivant tes anciens clients. Un SMS « disponible cette semaine ? » à tes 5 derniers clients.",
      current: currentIndependencePct,
      target: monthlyObj.independence_percentage_target,
      unit: '%',
      actionPlan: `Réactive ${Math.max(3, Math.ceil(gap / 5))} anciens clients cette semaine`,
    });
  }

  // Trier par sévérité (critical d'abord)
  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });
}

export function AcquisitionAlerts({
  entries,
  objectives,
  totalDirectClients,
  currentIndependencePct,
}: AcquisitionAlertsProps) {
  const monthlyObj = useMemo(
    () => objectives.find((o) => o.period_type === 'monthly'),
    [objectives],
  );

  const [dismissed, setDismissed] = useState<Record<string, number>>({});

  // Charger les dismissals (avec expiration 24h)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ALERTS_DISMISSED_KEY);
      if (raw) {
        const parsed: Record<string, number> = JSON.parse(raw);
        const now = Date.now();
        const valid: Record<string, number> = {};
        Object.entries(parsed).forEach(([id, ts]) => {
          if (now - ts < DISMISS_DURATION_MS) valid[id] = ts;
        });
        setDismissed(valid);
        if (Object.keys(valid).length !== Object.keys(parsed).length) {
          localStorage.setItem(ALERTS_DISMISSED_KEY, JSON.stringify(valid));
        }
      }
    } catch {}
  }, []);

  const allAlerts = useMemo(
    () => buildAlerts(entries, monthlyObj, totalDirectClients, currentIndependencePct),
    [entries, monthlyObj, totalDirectClients, currentIndependencePct],
  );

  const visibleAlerts = useMemo(
    () => allAlerts.filter((a) => !dismissed[a.id]).slice(0, 2),
    [allAlerts, dismissed],
  );

  const handleDismiss = (id: string) => {
    setDismissed((prev) => {
      const next = { ...prev, [id]: Date.now() };
      try {
        localStorage.setItem(ALERTS_DISMISSED_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleScrollTo = (anchor?: string) => {
    if (!anchor) return;
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {visibleAlerts.map((alert) => {
          const styles = SEVERITY_STYLES[alert.severity];
          const Icon = alert.icon;
          const completion = alert.target > 0 ? Math.min(100, Math.round((alert.current / alert.target) * 100)) : 0;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Card className={cn('overflow-hidden border-2 relative', styles.border, styles.bg)}>
                <CardContent className="p-3.5">
                  <div className="flex items-start gap-3">
                    <div className={cn('flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center', styles.iconBg)}>
                      <Icon className={cn('w-4.5 h-4.5', styles.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="text-sm font-semibold leading-tight">{alert.title}</h4>
                            <Badge variant="outline" className={cn('text-[9px] px-1.5 h-4', styles.badge)}>
                              {styles.label}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{alert.diagnostic}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDismiss(alert.id)}
                          aria-label="Reporter à demain"
                          className="flex-shrink-0 p-1 rounded-md hover:bg-muted/60 transition-colors -mr-1 -mt-1"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>

                      {/* Progression */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Avancement</span>
                          <span className={cn('font-semibold tabular-nums', styles.iconColor)}>
                            {alert.current} / {alert.target} {alert.unit}
                          </span>
                        </div>
                        <Progress value={completion} className="h-1.5" />
                      </div>

                      {/* Reco */}
                      <div className="rounded-md bg-background/40 border border-border/40 p-2">
                        <p className="text-[11px] text-foreground/90 leading-relaxed">
                          {alert.recommendation}
                        </p>
                      </div>

                      {/* Plan d'action + CTA */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium">
                          <Zap className={cn('w-3 h-3', styles.iconColor)} />
                          <span className="text-foreground/80">{alert.actionPlan}</span>
                        </div>
                        {alert.scrollTo && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleScrollTo(alert.scrollTo)}
                            className="h-6 text-[10px] gap-1 px-2"
                          >
                            Voir
                            <ArrowRight className="w-2.5 h-2.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

const SEVERITY_STYLES: Record<
  AlertSeverity,
  {
    iconBg: string;
    iconColor: string;
    border: string;
    bg: string;
    badge: string;
    label: string;
  }
> = {
  critical: {
    iconBg: 'bg-destructive/15',
    iconColor: 'text-destructive',
    border: 'border-destructive/40',
    bg: 'bg-gradient-to-br from-destructive/5 to-transparent',
    badge: 'border-destructive/40 text-destructive',
    label: 'Urgent',
  },
  warning: {
    iconBg: 'bg-orange-500/15',
    iconColor: 'text-orange-500',
    border: 'border-orange-500/40',
    bg: 'bg-gradient-to-br from-orange-500/5 to-transparent',
    badge: 'border-orange-500/40 text-orange-600 dark:text-orange-400',
    label: 'À rattraper',
  },
  info: {
    iconBg: 'bg-primary/15',
    iconColor: 'text-primary',
    border: 'border-primary/40',
    bg: 'bg-gradient-to-br from-primary/5 to-transparent',
    badge: 'border-primary/40 text-primary',
    label: 'Info',
  },
};
