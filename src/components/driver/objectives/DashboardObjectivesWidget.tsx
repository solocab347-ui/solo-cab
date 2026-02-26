import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  TrendingUp, 
  ChevronRight,
  Trophy,
  Flame,
  CheckCircle2,
  Car,
  Calendar,
  CalendarDays,
  CalendarRange,
  Edit3,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DashboardObjectivesWidgetProps {
  driverId: string;
  driverName?: string;
  onNavigateToObjectives: () => void;
  refreshKey?: number;
}

interface PeriodStats {
  courses: number;
  revenue: number;
  clients: number;
}

interface SoloCabStats {
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  year: PeriodStats;
}

interface ObjectiveSummary {
  hasObjectives: boolean;
  dailyProgress: number;
  dailyTarget: number;
  streakDays: number;
  isWorkingDay: boolean;
  unreadCoachingMessages: number;
  soloCabStats: SoloCabStats;
}

export function DashboardObjectivesWidget({ 
  driverId, 
  driverName,
  onNavigateToObjectives,
  refreshKey = 0
}: DashboardObjectivesWidgetProps) {
  const [summary, setSummary] = useState<ObjectiveSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!driverId) return;

      try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const weekStart = format(startOfWeek(now, { locale: fr }), 'yyyy-MM-dd');
        const weekEnd = format(endOfWeek(now, { locale: fr }), 'yyyy-MM-dd');
        const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
        const yearStart = format(startOfYear(now), 'yyyy-MM-dd');
        const yearEnd = format(endOfYear(now), 'yyyy-MM-dd');

        // Fetch objectives, schedule, coaching messages in parallel
        const [objectivesRes, scheduleRes, messagesRes] = await Promise.all([
          supabase
            .from('driver_objectives')
            .select('*')
            .eq('driver_id', driverId)
            .eq('period_type', 'daily')
            .maybeSingle(),
          supabase
            .from('driver_work_schedules')
            .select('*')
            .eq('driver_id', driverId)
            .eq('day_of_week', now.getDay()),
          supabase
            .from('driver_coaching_messages')
            .select('id')
            .eq('driver_id', driverId)
            .eq('is_read', false)
        ]);

        // Fetch all SoloCab courses data for all periods
        const [todayCourses, weekCourses, monthCourses, yearCourses, todayClients, weekClients, monthClients, yearClients] = await Promise.all([
          // Today's courses
          supabase
            .from('courses')
            .select('id, final_payment_amount, guest_estimated_price')
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
            .eq('status', 'completed')
            .gte('scheduled_date', `${today}T00:00:00`)
            .lte('scheduled_date', `${today}T23:59:59`),
          // Week courses
          supabase
            .from('courses')
            .select('id, final_payment_amount, guest_estimated_price')
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
            .eq('status', 'completed')
            .gte('scheduled_date', `${weekStart}T00:00:00`)
            .lte('scheduled_date', `${weekEnd}T23:59:59`),
          // Month courses
          supabase
            .from('courses')
            .select('id, final_payment_amount, guest_estimated_price')
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
            .eq('status', 'completed')
            .gte('scheduled_date', `${monthStart}T00:00:00`)
            .lte('scheduled_date', `${monthEnd}T23:59:59`),
          // Year courses
          supabase
            .from('courses')
            .select('id, final_payment_amount, guest_estimated_price')
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
            .eq('status', 'completed')
            .gte('scheduled_date', `${yearStart}T00:00:00`)
            .lte('scheduled_date', `${yearEnd}T23:59:59`),
          // Today's new clients
          supabase
            .from('clients')
            .select('id')
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`),
          // Week new clients
          supabase
            .from('clients')
            .select('id')
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
            .gte('created_at', `${weekStart}T00:00:00`)
            .lte('created_at', `${weekEnd}T23:59:59`),
          // Month new clients
          supabase
            .from('clients')
            .select('id')
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
            .gte('created_at', `${monthStart}T00:00:00`)
            .lte('created_at', `${monthEnd}T23:59:59`),
          // Year new clients
          supabase
            .from('clients')
            .select('id')
            .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
            .gte('created_at', `${yearStart}T00:00:00`)
            .lte('created_at', `${yearEnd}T23:59:59`)
        ]);

        // Also fetch external platform entries for all periods to include in consolidated stats
        const [todayExternal, weekExternal, monthExternal, yearExternal] = await Promise.all([
          supabase.from('driver_daily_entries').select('revenue, courses_count').eq('driver_id', driverId).eq('entry_date', today).eq('is_solocab', false),
          supabase.from('driver_daily_entries').select('revenue, courses_count').eq('driver_id', driverId).eq('is_solocab', false).gte('entry_date', weekStart).lte('entry_date', weekEnd),
          supabase.from('driver_daily_entries').select('revenue, courses_count').eq('driver_id', driverId).eq('is_solocab', false).gte('entry_date', monthStart).lte('entry_date', monthEnd),
          supabase.from('driver_daily_entries').select('revenue, courses_count').eq('driver_id', driverId).eq('is_solocab', false).gte('entry_date', yearStart).lte('entry_date', yearEnd),
        ]);

        const sumEntries = (data: any[] | null) => ({
          revenue: data?.reduce((s, e) => s + (e.revenue || 0), 0) || 0,
          courses: data?.reduce((s, e) => s + (e.courses_count || 0), 0) || 0,
        });

        const extToday = sumEntries(todayExternal.data);
        const extWeek = sumEntries(weekExternal.data);
        const extMonth = sumEntries(monthExternal.data);
        const extYear = sumEntries(yearExternal.data);

        // Calculate stats for each period
        const calcPeriodStats = (courses: any[] | null, clients: any[] | null): PeriodStats => ({
          courses: courses?.length || 0,
          revenue: courses?.reduce((sum, c) => sum + ((c as any).final_payment_amount || (c as any).guest_estimated_price || 0), 0) || 0,
          clients: clients?.length || 0
        });

        const soloCabStats: SoloCabStats = {
          today: { ...calcPeriodStats(todayCourses.data, todayClients.data), revenue: calcPeriodStats(todayCourses.data, todayClients.data).revenue + extToday.revenue, courses: calcPeriodStats(todayCourses.data, todayClients.data).courses + extToday.courses },
          week: { ...calcPeriodStats(weekCourses.data, weekClients.data), revenue: calcPeriodStats(weekCourses.data, weekClients.data).revenue + extWeek.revenue, courses: calcPeriodStats(weekCourses.data, weekClients.data).courses + extWeek.courses },
          month: { ...calcPeriodStats(monthCourses.data, monthClients.data), revenue: calcPeriodStats(monthCourses.data, monthClients.data).revenue + extMonth.revenue, courses: calcPeriodStats(monthCourses.data, monthClients.data).courses + extMonth.courses },
          year: { ...calcPeriodStats(yearCourses.data, yearClients.data), revenue: calcPeriodStats(yearCourses.data, yearClients.data).revenue + extYear.revenue, courses: calcPeriodStats(yearCourses.data, yearClients.data).courses + extYear.courses },
        };

        const hasObjectives = !!objectivesRes.data;
        const dailyTarget = objectivesRes.data?.revenue_target || 0;
        const todayRevenue = soloCabStats.today.revenue;
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
            for (let i = 0; i < 30; i++) {
              const checkDate = new Date(now);
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
          isWorkingDay,
          unreadCoachingMessages: messagesRes.data?.length || 0,
          soloCabStats
        });
      } catch (error) {
        console.error('Error fetching objectives summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [driverId, refreshKey]);

  if (loading || !summary) {
    return (
      <Card className="relative overflow-hidden p-4 sm:p-6 bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border border-border/50 animate-pulse">
        <div className="h-32 bg-muted/20 rounded-lg"></div>
      </Card>
    );
  }

  // Note: Les objectifs sont maintenant définis à l'inscription, 
  // donc on affiche toujours les stats même sans objectifs explicites

  // Has objectives - Show progress summary with full SoloCab stats
  const progressColor = summary.dailyProgress >= 100 ? 'bg-success' : 
                        summary.dailyProgress >= 50 ? 'bg-primary' : 'bg-warning';

  const stats = summary.soloCabStats;

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
                    ? `${stats.today.revenue.toFixed(0)}€ / ${summary.dailyTarget.toFixed(0)}€ • ${stats.today.courses} course${stats.today.courses !== 1 ? 's' : ''}`
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
            <div className="space-y-2 mb-4">
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
                    Reste {(summary.dailyTarget - stats.today.revenue).toFixed(0)}€
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

          {/* SoloCab Stats Grid */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {/* Today */}
            <div className="bg-muted/20 rounded-lg p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-primary" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Jour</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-foreground">{stats.today.revenue.toFixed(0)}€</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                <Car className="w-3 h-3 inline mr-0.5" />{stats.today.courses}
              </p>
            </div>

            {/* Week */}
            <div className="bg-muted/20 rounded-lg p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CalendarDays className="w-3 h-3 text-accent" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Semaine</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-foreground">{stats.week.revenue.toFixed(0)}€</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                <Car className="w-3 h-3 inline mr-0.5" />{stats.week.courses}
              </p>
            </div>

            {/* Month */}
            <div className="bg-muted/20 rounded-lg p-2 sm:p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CalendarRange className="w-3 h-3 text-success" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Mois</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-foreground">{stats.month.revenue.toFixed(0)}€</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                <Car className="w-3 h-3 inline mr-0.5" />{stats.month.courses}
              </p>
            </div>

            {/* Year */}
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg p-2 sm:p-3 text-center border border-primary/20">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Trophy className="w-3 h-3 text-warning" />
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Année</span>
              </div>
              <p className="text-sm sm:text-lg font-bold text-foreground">{stats.year.revenue.toFixed(0)}€</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                <Car className="w-3 h-3 inline mr-0.5" />{stats.year.courses}
              </p>
            </div>
          </div>

          {/* Rest day message */}
          {!summary.isWorkingDay && (
            <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg mt-4">
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
