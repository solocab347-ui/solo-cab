import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Bot, 
  Target, 
  TrendingUp, 
  Sparkles, 
  ChevronRight,
  Trophy,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardObjectivesWidgetProps {
  driverId: string;
  driverName?: string;
  onNavigateToObjectives: () => void;
}

interface ObjectiveSummary {
  hasObjectives: boolean;
  dailyProgress: number;
  dailyTarget: number;
  streakDays: number;
  todayRevenue: number;
  isWorkingDay: boolean;
  unreadCoachingMessages: number;
}

export function DashboardObjectivesWidget({ 
  driverId, 
  driverName,
  onNavigateToObjectives 
}: DashboardObjectivesWidgetProps) {
  const [summary, setSummary] = useState<ObjectiveSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!driverId) return;

      try {
        // Fetch objectives, schedule, and coaching messages in parallel
        const [objectivesRes, scheduleRes, messagesRes, entriesRes] = await Promise.all([
          supabase
            .from('driver_objectives')
            .select('*')
            .eq('driver_id', driverId)
            .eq('period_type', 'daily')
            .maybeSingle(),
          supabase
            .from('driver_work_schedule')
            .select('*')
            .eq('driver_id', driverId)
            .eq('day_of_week', new Date().getDay()),
          supabase
            .from('driver_coaching_messages')
            .select('id')
            .eq('driver_id', driverId)
            .eq('is_read', false),
          supabase
            .from('driver_daily_entries')
            .select('revenue')
            .eq('driver_id', driverId)
            .eq('entry_date', new Date().toISOString().split('T')[0])
        ]);

        const hasObjectives = !!objectivesRes.data;
        const dailyTarget = objectivesRes.data?.revenue_target || 0;
        const todayRevenue = entriesRes.data?.reduce((sum, e) => sum + (e.revenue || 0), 0) || 0;
        const dailyProgress = dailyTarget > 0 ? Math.min(100, (todayRevenue / dailyTarget) * 100) : 0;
        
        // Schedule returns an array, get first item
        const scheduleData = scheduleRes.data?.[0];
        const isWorkingDay = scheduleData?.is_working_day ?? true;

        // Calculate streak from recent entries
        let streakDays = 0;
        if (hasObjectives) {
          const { data: recentEntries } = await supabase
            .from('driver_daily_entries')
            .select('entry_date, revenue')
            .eq('driver_id', driverId)
            .order('entry_date', { ascending: false })
            .limit(30);

          if (recentEntries) {
            const today = new Date();
            for (let i = 0; i < 30; i++) {
              const checkDate = new Date(today);
              checkDate.setDate(checkDate.getDate() - i);
              const dateStr = checkDate.toISOString().split('T')[0];
              const entry = recentEntries.find(e => e.entry_date === dateStr);
              if (entry && entry.revenue > 0) {
                streakDays++;
              } else if (i > 0) {
                break;
              }
            }
          }
        }

        setSummary({
          hasObjectives,
          dailyProgress,
          dailyTarget,
          streakDays,
          todayRevenue,
          isWorkingDay,
          unreadCoachingMessages: messagesRes.data?.length || 0
        });
      } catch (error) {
        console.error('Error fetching objectives summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [driverId]);

  if (loading) {
    return (
      <Card className="relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-border/50 animate-pulse">
        <div className="h-24 bg-muted/20 rounded-lg"></div>
      </Card>
    );
  }

  // No objectives set - Show onboarding CTA
  if (!summary?.hasObjectives) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card 
          className="relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 backdrop-blur-xl border border-primary/20 cursor-pointer hover:scale-[1.01] transition-all group"
          onClick={onNavigateToObjectives}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-50"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/20 text-primary border-0 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Coach IA
                </Badge>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
                {driverName ? `${driverName}, ` : ''}Commencez votre parcours
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                Définissez vos objectifs et laissez votre assistant IA vous guider vers l'indépendance
              </p>
            </div>

            <div className="flex-shrink-0 hidden sm:block">
              <Button 
                variant="default" 
                size="sm"
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                Commencer
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Has objectives - Show progress summary
  const progressColor = summary.dailyProgress >= 100 ? 'bg-success' : 
                        summary.dailyProgress >= 50 ? 'bg-primary' : 'bg-warning';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card 
        className="relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-border/50 cursor-pointer hover:scale-[1.01] transition-all group"
        onClick={onNavigateToObjectives}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-30"></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {summary.isWorkingDay ? "Objectif du jour" : "Jour de repos"}
                  </h3>
                  {summary.unreadCoachingMessages > 0 && (
                    <Badge className="bg-destructive text-destructive-foreground border-0 text-xs animate-pulse">
                      {summary.unreadCoachingMessages}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.isWorkingDay 
                    ? `${summary.todayRevenue.toFixed(0)}€ / ${summary.dailyTarget.toFixed(0)}€`
                    : "Profitez de votre repos !"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Streak Badge */}
              {summary.streakDays > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-warning/20 rounded-full">
                  <Flame className="w-4 h-4 text-warning" />
                  <span className="text-xs font-bold text-warning">{summary.streakDays}j</span>
                </div>
              )}
              
              {/* Progress indicator */}
              <AnimatePresence>
                {summary.dailyProgress >= 100 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center"
                  >
                    <Trophy className="w-4 h-4 text-success" />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>

          {/* Progress Bar - only show on working days */}
          {summary.isWorkingDay && (
            <div className="space-y-2">
              <div className="relative h-3 bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, summary.dailyProgress)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`absolute inset-y-0 left-0 ${progressColor} rounded-full`}
                />
                {summary.dailyProgress >= 100 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{summary.dailyProgress.toFixed(0)}% atteint</span>
                {summary.dailyProgress < 100 && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Reste {(summary.dailyTarget - summary.todayRevenue).toFixed(0)}€
                  </span>
                )}
                {summary.dailyProgress >= 100 && (
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="w-3 h-3" />
                    Objectif atteint !
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Rest day message */}
          {!summary.isWorkingDay && (
            <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Votre coach IA vous attend pour votre prochaine session
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
