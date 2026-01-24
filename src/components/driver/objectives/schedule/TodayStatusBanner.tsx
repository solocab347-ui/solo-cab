import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sun, 
  Moon, 
  Clock, 
  Target, 
  Coffee,
  Palmtree,
  TrendingUp,
  Sparkles,
  Battery,
  Heart,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DaySchedule {
  is_working_day: boolean;
  start_time: string;
  end_time: string;
  target_hours: number;
  break_start?: string;
  break_end?: string;
}

interface TodayProgress {
  revenue: number;
  courses: number;
  hours: number;
  revenueTarget: number;
  coursesTarget: number;
  hoursTarget: number;
}

interface TodayStatusBannerProps {
  schedule: DaySchedule | null;
  progress?: TodayProgress;
}

// Motivational messages for rest days
const REST_DAY_MESSAGES = [
  { icon: Palmtree, title: "Jour de repos bien mérité", message: "Profitez de cette pause pour recharger vos batteries 🌴" },
  { icon: Heart, title: "Prenez soin de vous", message: "Le repos fait partie de la performance. Vous le méritez ❤️" },
  { icon: Battery, title: "Rechargez vos batteries", message: "Un esprit reposé est un esprit productif 🔋" },
  { icon: Coffee, title: "Pause café bien méritée", message: "Détendez-vous, demain sera une grande journée ☕" },
  { icon: Sparkles, title: "Journée tranquille", message: "Pas d'objectifs aujourd'hui, juste du repos ✨" },
];

// Motivational messages for work days based on time of day
const getWorkDayMessage = (hour: number, progress: number) => {
  if (hour < 10) {
    return { icon: Sun, message: "Début de journée ! Chaque course compte 🌅" };
  }
  if (hour < 14) {
    if (progress >= 50) {
      return { icon: TrendingUp, message: "Excellent rythme ! Continuez comme ça 🚀" };
    }
    return { icon: Target, message: "Matinée en cours, gardez le cap 🎯" };
  }
  if (hour < 18) {
    if (progress >= 75) {
      return { icon: Sparkles, message: "Objectif presque atteint ! Dernière ligne droite ✨" };
    }
    if (progress >= 50) {
      return { icon: Zap, message: "Après-midi dynamique, vous y êtes presque ⚡" };
    }
    return { icon: Target, message: "L'après-midi est le moment de pousser 💪" };
  }
  if (progress >= 100) {
    return { icon: Sparkles, message: "Objectif dépassé ! Bravo champion 🏆" };
  }
  return { icon: Moon, message: "Soirée productive, terminez en beauté 🌙" };
};

export function TodayStatusBanner({ schedule, progress }: TodayStatusBannerProps) {
  const now = new Date();
  const currentHour = now.getHours();
  const dayName = format(now, 'EEEE', { locale: fr });
  const formattedDate = format(now, 'd MMMM yyyy', { locale: fr });
  
  // If no schedule or rest day
  if (!schedule || !schedule.is_working_day) {
    const randomMessage = REST_DAY_MESSAGES[Math.floor(Math.random() * REST_DAY_MESSAGES.length)];
    const MessageIcon = randomMessage.icon;
    
    return (
      <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
        <CardContent className="py-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
              <MessageIcon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-xs">
                  <Palmtree className="w-3 h-3 mr-1" />
                  Jour de repos
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">{dayName}</span>
              </div>
              <h3 className="font-semibold text-lg">{randomMessage.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{randomMessage.message}</p>
              <p className="text-xs text-muted-foreground mt-2">{formattedDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Working day
  const revenueProgress = progress ? Math.round((progress.revenue / progress.revenueTarget) * 100) : 0;
  const coursesProgress = progress ? Math.round((progress.courses / progress.coursesTarget) * 100) : 0;
  const avgProgress = (revenueProgress + coursesProgress) / 2;
  
  const workMessage = getWorkDayMessage(currentHour, avgProgress);
  const WorkIcon = workMessage.icon;
  
  // Determine if we're in working hours
  const startHour = parseInt(schedule.start_time.split(':')[0]);
  const endHour = parseInt(schedule.end_time.split(':')[0]);
  const isInWorkingHours = currentHour >= startHour && currentHour < endHour;
  
  // Check if on break
  const isOnBreak = schedule.break_start && schedule.break_end && (() => {
    const breakStartHour = parseInt(schedule.break_start!.split(':')[0]);
    const breakEndHour = parseInt(schedule.break_end!.split(':')[0]);
    return currentHour >= breakStartHour && currentHour < breakEndHour;
  })();
  
  return (
    <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
      <CardContent className="py-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Left: Status */}
          <div className="flex items-start gap-4 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              {isOnBreak ? (
                <Coffee className="w-7 h-7 text-white" />
              ) : (
                <WorkIcon className="w-7 h-7 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`text-xs ${
                  isOnBreak 
                    ? 'bg-amber-500/20 text-amber-600 border-amber-500/30' 
                    : isInWorkingHours 
                      ? 'bg-green-500/20 text-green-600 border-green-500/30'
                      : 'bg-blue-500/20 text-blue-600 border-blue-500/30'
                }`}>
                  {isOnBreak ? (
                    <>
                      <Coffee className="w-3 h-3 mr-1" />
                      En pause
                    </>
                  ) : isInWorkingHours ? (
                    <>
                      <Clock className="w-3 h-3 mr-1" />
                      En service
                    </>
                  ) : currentHour < startHour ? (
                    <>
                      <Clock className="w-3 h-3 mr-1" />
                      Début à {schedule.start_time}
                    </>
                  ) : (
                    <>
                      <Moon className="w-3 h-3 mr-1" />
                      Fin de journée
                    </>
                  )}
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">{dayName}</span>
              </div>
              <h3 className="font-semibold text-lg">{isOnBreak ? 'Pause bien méritée' : workMessage.message}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Horaires: {schedule.start_time} → {schedule.end_time}
                {schedule.break_start && ` • Pause: ${schedule.break_start}-${schedule.break_end}`}
              </p>
            </div>
          </div>
          
          {/* Right: Progress Bars */}
          {progress && (
            <div className="flex-1 lg:max-w-[300px] space-y-3">
              {/* Revenue Progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">CA</span>
                  <span className="font-medium">{progress.revenue.toFixed(0)}€ / {progress.revenueTarget}€</span>
                </div>
                <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
                  <div 
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                      revenueProgress >= 100 ? 'bg-green-500' : 
                      revenueProgress >= 75 ? 'bg-blue-500' : 
                      revenueProgress >= 50 ? 'bg-amber-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(revenueProgress, 100)}%` }}
                  />
                </div>
              </div>
              
              {/* Courses Progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Courses</span>
                  <span className="font-medium">{progress.courses} / {progress.coursesTarget}</span>
                </div>
                <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
                  <div 
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                      coursesProgress >= 100 ? 'bg-green-500' : 
                      coursesProgress >= 75 ? 'bg-blue-500' : 
                      coursesProgress >= 50 ? 'bg-amber-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(coursesProgress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
