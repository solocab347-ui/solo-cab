import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ObjectiveProgress } from './types';
import { 
  TrendingUp, 
  Car, 
  Users, 
  Clock, 
  MapPin, 
  Star,
  Target,
  CheckCircle2,
  Flame,
  Compass,
  Rocket
} from 'lucide-react';

interface ObjectivesOverviewProps {
  progress: ObjectiveProgress[];
}

const PERIOD_LABELS = {
  daily: 'Aujourd\'hui',
  weekly: 'Cette semaine',
  monthly: 'Ce mois',
  yearly: 'Cette année',
};

const PERIOD_COLORS = {
  daily: 'from-blue-500 to-cyan-500',
  weekly: 'from-purple-500 to-pink-500',
  monthly: 'from-orange-500 to-amber-500',
  yearly: 'from-green-500 to-emerald-500',
};

// Calculate how far into the period we are (0-1)
const getPeriodProgress = (period: string): number => {
  const now = new Date();
  switch (period) {
    case 'daily': {
      const hours = now.getHours();
      return hours / 24;
    }
    case 'weekly': {
      const day = now.getDay() || 7; // 1=Mon, 7=Sun
      return day / 7;
    }
    case 'monthly': {
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return dayOfMonth / daysInMonth;
    }
    case 'yearly': {
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
      const endOfYear = new Date(now.getFullYear() + 1, 0, 1).getTime();
      return (now.getTime() - startOfYear) / (endOfYear - startOfYear);
    }
    default: return 0;
  }
};

export function ObjectivesOverview({ progress }: ObjectivesOverviewProps) {
  const getStatusBadge = (percentage: number, period: string) => {
    const periodProgress = getPeriodProgress(period);
    
    if (percentage >= 100) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Atteint 🎉</Badge>;
    }
    if (percentage >= 75) {
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><Flame className="w-3 h-3 mr-1" />En bonne voie</Badge>;
    }
    // If we're early in the period, be encouraging regardless of percentage
    if (periodProgress < 0.3) {
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><Rocket className="w-3 h-3 mr-1" />C'est parti !</Badge>;
    }
    if (percentage >= 50) {
      return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30"><Compass className="w-3 h-3 mr-1" />En progression</Badge>;
    }
    // Even for low %, use encouraging language
    if (periodProgress < 0.6) {
      return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30"><Compass className="w-3 h-3 mr-1" />Continue !</Badge>;
    }
    return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30"><Target className="w-3 h-3 mr-1" />À accélérer</Badge>;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-orange-400';
  };

  if (progress.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Aucun objectif défini</h3>
          <p className="text-sm text-muted-foreground">
            Configurez vos objectifs pour commencer le suivi
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Period Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {progress.map((p) => {
          const avgPercentage = p.objective 
            ? (p.percentage.revenue + p.percentage.courses + p.percentage.newClients) / 3 
            : 0;

          return (
            <Card key={p.period} className="overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${PERIOD_COLORS[p.period]}`} />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{PERIOD_LABELS[p.period]}</CardTitle>
                  {p.objective && getStatusBadge(avgPercentage, p.period)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {p.objective ? (
                  <>
                    {/* Revenue */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span>Chiffre d'affaires</span>
                        </div>
                        <span className="font-semibold">
                          {p.current.revenue.toFixed(0)}€ / {p.objective.revenue_target}€
                        </span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`absolute inset-y-0 left-0 ${getProgressColor(p.percentage.revenue)} transition-all`}
                          style={{ width: `${Math.min(p.percentage.revenue, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Courses */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-blue-500" />
                          <span>Courses</span>
                        </div>
                        <span className="font-semibold">
                          {p.current.courses} / {p.objective.courses_target}
                        </span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`absolute inset-y-0 left-0 ${getProgressColor(p.percentage.courses)} transition-all`}
                          style={{ width: `${Math.min(p.percentage.courses, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* New Clients */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-500" />
                          <span>Nouveaux clients</span>
                        </div>
                        <span className="font-semibold">
                          {p.current.newClients} / {p.objective.new_clients_target}
                        </span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`absolute inset-y-0 left-0 ${getProgressColor(p.percentage.newClients)} transition-all`}
                          style={{ width: `${Math.min(p.percentage.newClients, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Hours */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-500" />
                          <span>Heures travaillées</span>
                        </div>
                        <span className="font-semibold">
                          {p.current.hours.toFixed(1)}h / {p.objective.hours_target}h
                        </span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`absolute inset-y-0 left-0 ${getProgressColor(p.percentage.hours)} transition-all`}
                          style={{ width: `${Math.min(p.percentage.hours, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* KM */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span>Kilomètres</span>
                        </div>
                        <span className="font-semibold">
                          {p.current.km.toFixed(0)} km / {p.objective.km_target} km
                        </span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`absolute inset-y-0 left-0 ${getProgressColor(p.percentage.km)} transition-all`}
                          style={{ width: `${Math.min(p.percentage.km, 100)}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    <p>Objectif non configuré</p>
                    <p className="text-xs mt-1">CA actuel: {p.current.revenue.toFixed(0)}€ • {p.current.courses} courses</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Résumé rapide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <TrendingUp className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <p className="text-lg font-bold">{progress.find(p => p.period === 'daily')?.current.revenue.toFixed(0) || 0}€</p>
              <p className="text-xs text-muted-foreground">Aujourd'hui</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Car className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold">{progress.find(p => p.period === 'daily')?.current.courses || 0}</p>
              <p className="text-xs text-muted-foreground">Courses</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Users className="w-5 h-5 mx-auto text-purple-500 mb-1" />
              <p className="text-lg font-bold">{progress.find(p => p.period === 'monthly')?.current.newClients || 0}</p>
              <p className="text-xs text-muted-foreground">Nvx clients/mois</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Clock className="w-5 h-5 mx-auto text-orange-500 mb-1" />
              <p className="text-lg font-bold">{progress.find(p => p.period === 'weekly')?.current.hours.toFixed(1) || 0}h</p>
              <p className="text-xs text-muted-foreground">Cette semaine</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <MapPin className="w-5 h-5 mx-auto text-red-500 mb-1" />
              <p className="text-lg font-bold">{progress.find(p => p.period === 'monthly')?.current.km.toFixed(0) || 0}</p>
              <p className="text-xs text-muted-foreground">Km ce mois</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
