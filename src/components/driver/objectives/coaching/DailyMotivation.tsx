import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ObjectiveProgress } from '../types';
import { 
  Flame, 
  Star, 
  TrendingUp, 
  Trophy,
  Coffee,
  Sunset,
  Moon,
  Sun,
  Target,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DailyMotivationProps {
  progress: ObjectiveProgress[];
  isWorkingDay: boolean;
  streakDays: number;
  driverName?: string;
}

export function DailyMotivation({ progress, isWorkingDay, streakDays, driverName }: DailyMotivationProps) {
  const dailyProgress = progress.find(p => p.period === 'daily');
  const weeklyProgress = progress.find(p => p.period === 'weekly');
  
  const currentHour = new Date().getHours();
  const revenuePercent = dailyProgress?.percentage.revenue || 0;
  const coursesPercent = dailyProgress?.percentage.courses || 0;

  // Time-based icon and greeting
  const timeInfo = useMemo(() => {
    if (currentHour >= 5 && currentHour < 12) {
      return { icon: Sun, greeting: "Bonne matinée", period: "matinée" };
    } else if (currentHour >= 12 && currentHour < 14) {
      return { icon: Coffee, greeting: "Bon appétit", period: "midi" };
    } else if (currentHour >= 14 && currentHour < 18) {
      return { icon: Sun, greeting: "Bon après-midi", period: "après-midi" };
    } else if (currentHour >= 18 && currentHour < 21) {
      return { icon: Sunset, greeting: "Bonne soirée", period: "soirée" };
    } else {
      return { icon: Moon, greeting: "Bonne nuit", period: "nuit" };
    }
  }, [currentHour]);

  // Motivational message based on performance
  const motivationMessage = useMemo(() => {
    if (!isWorkingDay) {
      return {
        emoji: "🌴",
        title: "Journée de repos",
        message: "Profitez de ce moment pour vous ressourcer. Un chauffeur reposé est un chauffeur performant !",
        type: "rest"
      };
    }

    if (revenuePercent >= 100) {
      return {
        emoji: "🏆",
        title: "Objectif atteint !",
        message: "Félicitations ! Vous avez dépassé vos objectifs aujourd'hui. Continuez sur cette lancée !",
        type: "success"
      };
    } else if (revenuePercent >= 80) {
      return {
        emoji: "🔥",
        title: "Presque au but !",
        message: `Plus que ${Math.round(100 - revenuePercent)}% pour atteindre votre objectif. Vous y êtes presque !`,
        type: "close"
      };
    } else if (revenuePercent >= 50) {
      return {
        emoji: "💪",
        title: "Belle progression !",
        message: "Vous êtes à mi-chemin. Chaque course vous rapproche de votre objectif !",
        type: "progress"
      };
    } else if (revenuePercent > 0) {
      return {
        emoji: "🚀",
        title: "C'est parti !",
        message: "Vous avez commencé la journée. Les meilleures heures sont devant vous !",
        type: "started"
      };
    } else {
      return {
        emoji: "☀️",
        title: "Nouvelle journée",
        message: "Prêt à atteindre vos objectifs aujourd'hui ? C'est le moment de briller !",
        type: "new"
      };
    }
  }, [revenuePercent, isWorkingDay]);

  // Streak message
  const streakMessage = useMemo(() => {
    if (streakDays === 0) return null;
    if (streakDays >= 30) return `🏅 ${streakDays} jours d'excellence !`;
    if (streakDays >= 14) return `🔥 ${streakDays} jours de suite ! Incroyable !`;
    if (streakDays >= 7) return `⚡ ${streakDays} jours consécutifs !`;
    if (streakDays >= 3) return `✨ ${streakDays} jours d'affilée !`;
    return `👍 ${streakDays} jour${streakDays > 1 ? 's' : ''} en série`;
  }, [streakDays]);

  const TimeIcon = timeInfo.icon;

  return (
    <Card className={`overflow-hidden ${
      motivationMessage.type === 'success' 
        ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30'
        : motivationMessage.type === 'rest'
        ? 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30'
        : 'bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Time Icon */}
          <motion.div
            animate={{ 
              rotate: motivationMessage.type === 'success' ? [0, 10, -10, 0] : 0,
              scale: motivationMessage.type === 'success' ? [1, 1.1, 1] : 1
            }}
            transition={{ repeat: motivationMessage.type === 'success' ? Infinity : 0, duration: 2 }}
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              motivationMessage.type === 'success'
                ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                : motivationMessage.type === 'rest'
                ? 'bg-gradient-to-br from-blue-500 to-indigo-500'
                : 'bg-gradient-to-br from-primary to-accent'
            }`}
          >
            <span className="text-2xl">{motivationMessage.emoji}</span>
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{motivationMessage.title}</h3>
              {streakMessage && (
                <Badge variant="secondary" className="text-[10px] bg-orange-500/20 text-orange-600">
                  <Flame className="w-3 h-3 mr-1" />
                  {streakMessage}
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mt-1">
              {motivationMessage.message}
            </p>

            {/* Progress bars for working days */}
            {isWorkingDay && dailyProgress?.objective && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Objectif CA
                  </span>
                  <span className="font-medium">
                    {dailyProgress.current.revenue.toFixed(0)}€ / {dailyProgress.objective.revenue_target}€
                  </span>
                </div>
                <Progress 
                  value={Math.min(revenuePercent, 100)} 
                  className={`h-2 ${revenuePercent >= 100 ? '[&>div]:bg-green-500' : ''}`}
                />

                {/* Mini stats */}
                <div className="flex gap-3 pt-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    <span>{dailyProgress.current.courses} courses</span>
                  </div>
                  {weeklyProgress && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3" />
                      <span>Semaine: {weeklyProgress.percentage.revenue.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rest day suggestions */}
            {!isWorkingDay && (
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { icon: Sparkles, text: "Préparez demain" },
                  { icon: Trophy, text: "Revoyez vos objectifs" },
                ].map((item) => (
                  <Badge key={item.text} variant="outline" className="text-xs">
                    <item.icon className="w-3 h-3 mr-1" />
                    {item.text}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
