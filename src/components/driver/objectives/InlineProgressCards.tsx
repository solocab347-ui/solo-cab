import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ObjectiveProgress } from './types';
import { RevenueDetailSheet } from './RevenueDetailSheet';
import { 
  TrendingUp, Car, Users, Clock, MapPin,
  CheckCircle2, Flame, Rocket, Compass, Target
} from 'lucide-react';

interface InlineProgressCardsProps {
  progress: ObjectiveProgress[];
  driverId?: string;
}

const PERIOD_LABELS: Record<string, string> = {
  daily: "Aujourd'hui",
  weekly: 'Semaine',
  monthly: 'Mois',
  yearly: 'Année',
};

const getPeriodProgress = (period: string): number => {
  const now = new Date();
  switch (period) {
    case 'daily': return now.getHours() / 24;
    case 'weekly': return (now.getDay() || 7) / 7;
    case 'monthly': return now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    case 'yearly': {
      const start = new Date(now.getFullYear(), 0, 1).getTime();
      const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
      return (now.getTime() - start) / (end - start);
    }
    default: return 0;
  }
};

function getStatusInfo(percentage: number, period: string) {
  const pp = getPeriodProgress(period);
  if (percentage >= 100) return { icon: CheckCircle2, label: 'Atteint 🎉', color: 'text-green-500 bg-green-500/20 border-green-500/30' };
  if (percentage >= 75) return { icon: Flame, label: 'En bonne voie', color: 'text-blue-500 bg-blue-500/20 border-blue-500/30' };
  if (pp < 0.3) return { icon: Rocket, label: "C'est parti !", color: 'text-blue-500 bg-blue-500/20 border-blue-500/30' };
  if (percentage >= 50) return { icon: Compass, label: 'En progression', color: 'text-amber-500 bg-amber-500/20 border-amber-500/30' };
  if (pp < 0.6) return { icon: Compass, label: 'Continue !', color: 'text-amber-500 bg-amber-500/20 border-amber-500/30' };
  return { icon: Target, label: 'À accélérer', color: 'text-amber-500 bg-amber-500/20 border-amber-500/30' };
}

function getBarColor(pct: number) {
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 75) return 'bg-blue-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-orange-400';
}

const METRICS = [
  { key: 'revenue' as const, icon: TrendingUp, color: 'text-green-500', label: 'CA', format: (v: number, t: number) => `${v.toFixed(0)}€ / ${t}€` },
  { key: 'courses' as const, icon: Car, color: 'text-blue-500', label: 'Courses', format: (v: number, t: number) => `${v} / ${t}` },
  { key: 'newClients' as const, icon: Users, color: 'text-purple-500', label: 'Clients', format: (v: number, t: number) => `${v} / ${t}` },
];

const TARGET_KEYS: Record<string, string> = {
  revenue: 'revenue_target',
  courses: 'courses_target',
  newClients: 'new_clients_target',
};

const CURRENT_KEYS: Record<string, string> = {
  revenue: 'revenue',
  courses: 'courses',
  newClients: 'newClients',
};

export function InlineProgressCards({ progress, driverId }: InlineProgressCardsProps) {
  const [detailSheet, setDetailSheet] = useState<{ open: boolean; period: 'daily' | 'weekly' | 'monthly' | 'yearly'; revenue: number; target: number }>({
    open: false, period: 'daily', revenue: 0, target: 0
  });

  if (progress.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Aucun objectif défini</p>
          <p className="text-sm text-muted-foreground mt-1">Configurez vos objectifs ci-dessous</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {progress.map((p) => {
            const avg = p.objective
              ? (p.percentage.revenue + p.percentage.courses + p.percentage.newClients) / 3
              : 0;
            const status = getStatusInfo(avg, p.period);
            const StatusIcon = status.icon;

            return (
              <Card key={p.period} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold">{PERIOD_LABELS[p.period]}</span>
                    {p.objective && (
                      <Badge className={`text-[9px] px-1.5 py-0.5 ${status.color}`}>
                        <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                        {status.label}
                      </Badge>
                    )}
                  </div>

                  {p.objective ? (
                    <div className="space-y-1.5">
                      {METRICS.map((m) => {
                        const current = (p.current as any)[CURRENT_KEYS[m.key]] || 0;
                        const target = (p.objective as any)[TARGET_KEYS[m.key]] || 0;
                        const pct = p.percentage[m.key];
                        const Icon = m.icon;
                        const isRevenue = m.key === 'revenue';

                        return (
                          <div
                            key={m.key}
                            className={isRevenue && driverId ? 'cursor-pointer hover:bg-muted/80 rounded-md p-0.5 -m-0.5 transition-colors active:scale-[0.98]' : ''}
                            onClick={isRevenue && driverId ? () => setDetailSheet({ open: true, period: p.period, revenue: current, target }) : undefined}
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="flex items-center gap-1">
                                <Icon className={`w-3 h-3 ${m.color}`} />
                                {m.label}
                                {isRevenue && driverId && <span className="text-[8px] text-primary">▸</span>}
                              </span>
                              <span className="font-medium">{m.format(current, target)}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
                              <div
                                className={`h-full ${getBarColor(pct)} transition-all duration-500`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Non configuré</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {driverId && (
        <RevenueDetailSheet
          open={detailSheet.open}
          onOpenChange={(open) => setDetailSheet(prev => ({ ...prev, open }))}
          driverId={driverId}
          period={detailSheet.period}
          totalRevenue={detailSheet.revenue}
          totalTarget={detailSheet.target}
        />
      )}
    </>
  );
}
