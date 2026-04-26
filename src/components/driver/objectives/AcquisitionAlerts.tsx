import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Hand, QrCode, UserPlus, Crown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DriverDailyEntry, DriverObjective } from './types';

export interface ActiveAlert {
  id: string;
  severity: 'warning' | 'critical' | 'info';
  icon: React.ReactNode;
  title: string;
  message: string;
  recommendation: string;
  cta?: { label: string; onClick: () => void };
}

interface Props {
  entries: DriverDailyEntry[];
  objectives: DriverObjective[];
  totalDirectClients: number;
  loyalClientsCount: number;
  /** Optionnel : appelé quand l'utilisateur veut éditer ses cibles */
  onEditTargets?: () => void;
  /** Optionnel : remonte les IDs d'alertes actives au parent (pour dédup avec coach) */
  onAlertsChange?: (ids: string[]) => void;
}

/**
 * Affiche des alertes actionnables quand le chauffeur passe sous des seuils
 * d'acquisition critiques (cartes, scans, conversion, indépendance).
 *
 * Topics utilisés (cohérents avec ALERT_TOPIC_TO_NUDGE_IDS dans AcquisitionCoach) :
 *  - thr-cards         (proposition trop faible)
 *  - thr-scan-rate     (scans/proposition trop bas)
 *  - thr-conversion    (signups/scans trop bas)
 *  - thr-clients       (peu de clients fidèles)
 */
export function AcquisitionAlerts({
  entries,
  objectives,
  totalDirectClients,
  loyalClientsCount,
  onEditTargets,
  onAlertsChange,
}: Props) {
  const alerts = useMemo<ActiveAlert[]>(() => {
    const out: ActiveAlert[] = [];
    const monthly = objectives.find(o => o.period_type === 'monthly');
    if (!monthly) return out;

    // Cibles journalières prorata (mois ≈ 22 jours travaillés)
    const dailyCardsTarget = (monthly.cards_proposed_target || 0) / 22;
    const dailyScansTarget = (monthly.qr_scans_target || 0) / 22;
    const dailyClientsTarget = (monthly.direct_clients_target || 0) / 22;

    const last7 = entries.slice(0, 7);
    const sum = (arr: DriverDailyEntry[], k: keyof DriverDailyEntry) =>
      arr.reduce((s, e) => s + (Number(e[k]) || 0), 0);

    const courses7 = sum(last7, 'courses_count');
    const proposed7 = sum(last7, 'cards_proposed_count' as keyof DriverDailyEntry);
    const scans7 = sum(last7, 'qr_scans_count' as keyof DriverDailyEntry);
    const signups7 = sum(last7, 'direct_signups_count' as keyof DriverDailyEntry);

    const proposalRate = courses7 > 0 ? proposed7 / courses7 : 0;
    const scanRate = proposed7 > 0 ? scans7 / proposed7 : 0;
    const conversionRate = scans7 > 0 ? signups7 / scans7 : 0;

    const expectedCards7 = dailyCardsTarget * 7;
    const expectedScans7 = dailyScansTarget * 7;
    const expectedClients7 = dailyClientsTarget * 7;

    // 1. Cartes proposées sous la cible (>30% sous l'attendu sur 7j)
    if (expectedCards7 > 0 && proposed7 < expectedCards7 * 0.7) {
      const deficit = Math.max(1, Math.round(expectedCards7 - proposed7));
      out.push({
        id: 'thr-cards',
        severity: proposed7 < expectedCards7 * 0.4 ? 'critical' : 'warning',
        icon: <Hand className="w-4 h-4" />,
        title: `Pas assez de cartes proposées (${proposed7}/${Math.round(expectedCards7)})`,
        message: `Sur 7 jours tu es à ${Math.round(proposalRate * 100)}% de propositions / course. Cible idéale : 1 carte par course.`,
        recommendation: `Propose ta carte sur tes ${deficit} prochaines courses. C'est l'action #1 qui débloque tout le reste.`,
      });
    }

    // 2. Taux de scan trop bas (<30%)
    if (proposed7 >= 5 && scanRate < 0.3) {
      out.push({
        id: 'thr-scan-rate',
        severity: scanRate < 0.15 ? 'critical' : 'warning',
        icon: <QrCode className="w-4 h-4" />,
        title: `Taux de scan faible : ${Math.round(scanRate * 100)}%`,
        message: `Tu proposes ta carte (${proposed7}) mais peu de clients la scannent (${scans7}).`,
        recommendation: `Pose la carte dans la main du client + dis "scanne avant de descendre, c'est 5 secondes". Le geste change tout.`,
      });
    }

    // 3. Conversion scan → signup trop basse (<20%)
    if (scans7 >= 3 && conversionRate < 0.2) {
      out.push({
        id: 'thr-conversion',
        severity: 'warning',
        icon: <UserPlus className="w-4 h-4" />,
        title: `Conversion scan → inscription : ${Math.round(conversionRate * 100)}%`,
        message: `${scans7} scans pour ${signups7} inscription(s). Ton profil public ne convainc peut-être pas assez.`,
        recommendation: `Vérifie ta photo, ton avatar, et les avis affichés sur ton profil public. C'est ce que voit le client après le scan.`,
      });
    }

    // 4. Trop peu de clients fidèles (loyal = ≥2 courses)
    if (totalDirectClients >= 5 && loyalClientsCount / Math.max(1, totalDirectClients) < 0.2) {
      out.push({
        id: 'thr-clients',
        severity: 'info',
        icon: <Crown className="w-4 h-4" />,
        title: `Peu de clients fidèles (${loyalClientsCount}/${totalDirectClients})`,
        message: `Moins de 20% de tes clients directs reviennent.`,
        recommendation: `Envoie un message après chaque course. Propose une réservation à l'avance pour leur prochain trajet.`,
      });
    }

    // 5. Scans manqués (clients directs en stagnation pendant 7j de courses)
    if (courses7 >= 10 && expectedClients7 >= 1 && signups7 === 0) {
      out.push({
        id: 'thr-clients',
        severity: 'warning',
        icon: <TrendingDown className="w-4 h-4" />,
        title: 'Aucun nouveau client direct cette semaine',
        message: `${courses7} courses sur 7 jours mais 0 inscription directe.`,
        recommendation: `L'objectif n'est pas la course, c'est le client. Propose la carte systématiquement la semaine prochaine.`,
      });
    }

    return out;
  }, [entries, objectives, totalDirectClients, loyalClientsCount]);

  // Remonte les IDs au parent pour dédup avec AcquisitionCoach
  useMemo(() => {
    onAlertsChange?.(alerts.map(a => a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.map(a => a.id).join('|')]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onEditTargets={onEditTargets}
        />
      ))}
    </div>
  );
}

function AlertCard({ alert, onEditTargets }: { alert: ActiveAlert; onEditTargets?: () => void }) {
  const styles = {
    critical: 'border-destructive/40 bg-destructive/5',
    warning: 'border-amber-500/40 bg-amber-500/5',
    info: 'border-primary/30 bg-primary/5',
  }[alert.severity];

  const iconBg = {
    critical: 'bg-destructive/15 text-destructive',
    warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    info: 'bg-primary/15 text-primary',
  }[alert.severity];

  return (
    <Card className={cn('border', styles)}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
            {alert.icon || <AlertTriangle className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold leading-tight">{alert.title}</h4>
              {alert.severity === 'critical' && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Urgent</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
            <p className="text-xs font-medium leading-relaxed">
              👉 {alert.recommendation}
            </p>
            {onEditTargets && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onEditTargets}
                className="h-8 px-2 text-xs -ml-2 mt-1"
              >
                Ajuster mes cibles
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
