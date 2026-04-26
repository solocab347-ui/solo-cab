import { useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, Hand, QrCode, UserPlus, Crown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DriverDailyEntry, DriverObjective } from './types';
import {
  computeAlertSignals,
  computeAlertsFromSignals,
  type ComputedAlert,
} from './acquisitionAlertsLogic';

interface Props {
  entries: DriverDailyEntry[];
  objectives: DriverObjective[];
  totalDirectClients: number;
  loyalClientsCount: number;
  onEditTargets?: () => void;
  onAlertsChange?: (ids: string[]) => void;
}

const ICON_MAP = {
  hand: <Hand className="w-4 h-4" />,
  qr: <QrCode className="w-4 h-4" />,
  signup: <UserPlus className="w-4 h-4" />,
  crown: <Crown className="w-4 h-4" />,
  'trend-down': <TrendingDown className="w-4 h-4" />,
};

export function AcquisitionAlerts({
  entries,
  objectives,
  totalDirectClients,
  loyalClientsCount,
  onEditTargets,
  onAlertsChange,
}: Props) {
  const alerts = useMemo<ComputedAlert[]>(() => {
    const signals = computeAlertSignals({ entries, objectives, totalDirectClients, loyalClientsCount });
    return computeAlertsFromSignals(signals);
  }, [entries, objectives, totalDirectClients, loyalClientsCount]);

  // Remonte les IDs au parent pour dédup avec AcquisitionCoach
  const alertIdsKey = alerts.map(a => a.id).join('|');
  useEffect(() => {
    onAlertsChange?.(alerts.map(a => a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertIdsKey]);

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

function AlertCard({ alert, onEditTargets }: { alert: ComputedAlert; onEditTargets?: () => void }) {
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
            {ICON_MAP[alert.iconKey] || <AlertTriangle className="w-4 h-4" />}
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
