import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDriverObjectives } from '@/hooks/useDriverObjectives';
import { ObjectivesOverview } from './ObjectivesOverview';
import { ObjectivesSetup } from './ObjectivesSetup';
import { DailyEntryForm } from './DailyEntryForm';
import { PlatformsManager } from './PlatformsManager';
import { WorkScheduleManager } from './WorkScheduleManager';
import { CoachingPanel } from './CoachingPanel';
import { ObjectivesHistory } from './ObjectivesHistory';
import { TodayStatusBanner } from './schedule/TodayStatusBanner';
import { OnboardingWizard, type OnboardingData } from './onboarding';
import { DailyMotivation } from './coaching';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Target, 
  Calendar, 
  PlusCircle, 
  Settings2, 
  Clock, 
  MessageSquare,
  History,
  Loader2,
  Sparkles
} from 'lucide-react';

interface ObjectivesDashboardProps {
  driverId: string;
  driverName?: string;
}

export function ObjectivesDashboard({ driverId, driverName }: ObjectivesDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const hook = useDriverObjectives(driverId);
  
  const unreadMessages = hook.coachingMessages.filter(m => !m.is_read).length;

  // Check if onboarding is needed
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        // Check if driver has any objectives set
        const { data: objectives } = await supabase
          .from('driver_objectives')
          .select('id')
          .eq('driver_id', driverId)
          .limit(1);

        // Show onboarding if no objectives exist
        setShowOnboarding(!objectives || objectives.length === 0);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setShowOnboarding(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [driverId]);

  // Handle onboarding completion
  const handleOnboardingComplete = async (data: OnboardingData, aiRecommendations: string) => {
    try {
      // First, delete any existing data for this driver to avoid conflicts
      await Promise.all([
        supabase.from('driver_objectives').delete().eq('driver_id', driverId),
        supabase.from('driver_work_schedules').delete().eq('driver_id', driverId),
      ]);

      // Prepare objectives for all periods
      const multipliers = {
        daily: { revenue: 1/22, clients: 1/22, hours: 1 },
        weekly: { revenue: 1/4, clients: 1/4, hours: data.workDaysPerWeek },
        monthly: { revenue: 1, clients: 1, hours: data.workDaysPerWeek * 4 },
        yearly: { revenue: 12, clients: 12, hours: data.workDaysPerWeek * 4 * 12 }
      };

      const objectivesToInsert = (['daily', 'weekly', 'monthly', 'yearly'] as const).map(period => {
        const mult = multipliers[period];
        return {
          driver_id: driverId,
          period_type: period,
          revenue_target: Math.round(data.targetMonthlyRevenue * mult.revenue),
          new_clients_target: Math.round(data.targetDirectClients * mult.clients),
          hours_target: Math.round(data.workHoursPerDay * mult.hours),
          courses_target: Math.round((data.targetMonthlyRevenue * mult.revenue) / 25),
          km_target: Math.round((data.targetMonthlyRevenue * mult.revenue) / 25 * 15),
          is_active: true
        };
      });

      // Prepare work schedules
      const schedulesToInsert = [];
      
      if (data.weekSchedule && data.weekSchedule.length > 0) {
        for (const daySchedule of data.weekSchedule) {
          const startH = parseInt(daySchedule.startTime.split(':')[0]);
          const endH = parseInt(daySchedule.endTime.split(':')[0]);
          let hours = endH - startH;
          if (hours < 0) hours += 24;
          
          schedulesToInsert.push({
            driver_id: driverId,
            day_of_week: daySchedule.dayIndex,
            is_working_day: daySchedule.isWorking,
            start_time: daySchedule.startTime,
            end_time: daySchedule.endTime,
            target_hours: daySchedule.isWorking ? Math.max(1, hours) : 0
          });
        }
      } else {
        const scheduleDefaults: Record<string, { start: string; end: string }> = {
          early: { start: '06:00', end: '14:00' },
          standard: { start: '08:00', end: '18:00' },
          late: { start: '16:00', end: '00:00' },
          flexible: { start: '09:00', end: '19:00' }
        };
        const schedule = scheduleDefaults[data.preferredSchedule] || scheduleDefaults.standard;
        
        for (let day = 0; day < 7; day++) {
          const isWorkDay = day !== 0 && day <= data.workDaysPerWeek;
          schedulesToInsert.push({
            driver_id: driverId,
            day_of_week: day,
            is_working_day: isWorkDay,
            start_time: schedule.start,
            end_time: schedule.end,
            target_hours: isWorkDay ? data.workHoursPerDay : 0
          });
        }
      }

      // Platforms to insert (avoid duplicates)
      const platformsToInsert = data.platformsUsed.map((platform, index) => ({
        driver_id: driverId,
        platform_name: platform.charAt(0).toUpperCase() + platform.slice(1),
        platform_icon: 'car',
        display_order: index
      }));

      // Execute all inserts in parallel
      const results = await Promise.allSettled([
        supabase.from('driver_objectives').insert(objectivesToInsert),
        supabase.from('driver_work_schedules').insert(schedulesToInsert),
        platformsToInsert.length > 0 ? supabase.from('driver_platforms').insert(platformsToInsert) : Promise.resolve({ error: null }),
        supabase.from('driver_coaching_messages').insert({
          driver_id: driverId,
          message_type: 'suggestion',
          title: '🎯 Votre plan personnalisé',
          content: aiRecommendations,
          is_read: false
        })
      ]);

      // Check for errors
      const errors = results.filter(r => 
        r.status === 'rejected' || 
        (r.status === 'fulfilled' && r.value && typeof r.value === 'object' && 'error' in r.value && r.value.error)
      );
      
      if (errors.length > 0) {
        console.error('Some saves failed:', errors);
      }

      setShowOnboarding(false);
      toast.success('Configuration terminée ! Votre coach IA est prêt.');
      
      // Refresh data
      hook.fetchAll?.();
      
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleSkipOnboarding = () => {
    setShowOnboarding(false);
  };

  // Loading state
  if (checkingOnboarding || hook.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show onboarding wizard
  if (showOnboarding) {
    return (
      <div className="pb-20">
        <OnboardingWizard 
          driverId={driverId}
          onComplete={handleOnboardingComplete}
          onSkip={handleSkipOnboarding}
        />
      </div>
    );
  }

  // Get today's schedule and progress for the status banner
  const today = new Date().getDay();
  const todayScheduleData = hook.schedule.find(s => s.day_of_week === today);
  const isWorkingDay = todayScheduleData?.is_working_day ?? true;
  const todaySchedule = todayScheduleData ? {
    is_working_day: todayScheduleData.is_working_day,
    start_time: todayScheduleData.start_time || '08:00',
    end_time: todayScheduleData.end_time || '18:00',
    target_hours: todayScheduleData.target_hours || 8,
  } : null;

  // Get daily progress
  const dailyProgress = hook.progress.find(p => p.period === 'daily');
  const progressData = dailyProgress && dailyProgress.objective ? {
    revenue: dailyProgress.current.revenue,
    courses: dailyProgress.current.courses,
    hours: dailyProgress.current.hours,
    revenueTarget: dailyProgress.objective.revenue_target,
    coursesTarget: dailyProgress.objective.courses_target,
    hoursTarget: dailyProgress.objective.hours_target,
  } : undefined;

  return (
    <div className="space-y-4 pb-20">
      {/* Daily Motivation Banner - Always visible at the top */}
      <DailyMotivation
        progress={hook.progress}
        isWorkingDay={isWorkingDay}
        streakDays={hook.driverStats.streakDays}
        driverName={driverName}
        onOpenCoach={() => setActiveTab('coaching')}
      />

      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Centre d'Objectifs</CardTitle>
              <p className="text-sm text-muted-foreground">
                Suivez vos performances et atteignez vos objectifs
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Card className="bg-card/50">
          <CardContent className="p-2">
            <TabsList className="flex flex-wrap w-full h-auto bg-transparent gap-1">
              <TabsTrigger 
                value="overview" 
                className="flex-1 min-w-[100px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <Target className="h-4 w-4" />
                <span className="text-[10px] font-medium">Vue d'ensemble</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="entry" 
                className="flex-1 min-w-[100px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="text-[10px] font-medium">Saisie</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="setup" 
                className="flex-1 min-w-[100px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <Settings2 className="h-4 w-4" />
                <span className="text-[10px] font-medium">Objectifs</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="schedule" 
                className="flex-1 min-w-[100px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <Clock className="h-4 w-4" />
                <span className="text-[10px] font-medium">Planning</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="platforms" 
                className="flex-1 min-w-[100px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-[10px] font-medium">Plateformes</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="coaching" 
                className="relative flex-1 min-w-[100px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-[10px] font-medium">Coaching</span>
                {unreadMessages > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] bg-destructive">
                    {unreadMessages}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="history" 
                className="flex-1 min-w-[100px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <History className="h-4 w-4" />
                <span className="text-[10px] font-medium">Historique</span>
              </TabsTrigger>
            </TabsList>
          </CardContent>
        </Card>

        <TabsContent value="overview" className="mt-4">
          <ObjectivesOverview progress={hook.progress} />
        </TabsContent>
        
        <TabsContent value="entry" className="mt-4">
          <DailyEntryForm 
            driverId={driverId}
            platforms={hook.platforms}
            onSubmit={hook.upsertDailyEntry}
            onSyncSoloCab={hook.syncSoloCabData}
            fetchSoloCabStats={hook.fetchSoloCabStats}
          />
        </TabsContent>
        
        <TabsContent value="setup" className="mt-4">
          <ObjectivesSetup 
            objectives={hook.objectives}
            onSave={hook.upsertObjective}
          />
        </TabsContent>
        
        <TabsContent value="schedule" className="mt-4">
          <WorkScheduleManager 
            schedule={hook.schedule}
            onSave={hook.upsertSchedule}
            dailyProgress={progressData}
          />
        </TabsContent>
        
        <TabsContent value="platforms" className="mt-4">
          <PlatformsManager 
            platforms={hook.platforms}
            onAdd={hook.addPlatform}
            onRemove={hook.removePlatform}
          />
        </TabsContent>
        
        <TabsContent value="coaching" className="mt-4">
          <CoachingPanel 
            driverId={driverId}
            messages={hook.coachingMessages}
            progress={hook.progress}
            driverStats={hook.driverStats}
            soloCabStats={hook.soloCabFullStats}
            isWorkingDay={isWorkingDay}
            driverName={driverName}
            onMarkRead={hook.markMessageRead}
          />
        </TabsContent>
        
        <TabsContent value="history" className="mt-4">
          <ObjectivesHistory 
            entries={hook.dailyEntries}
            platforms={hook.platforms}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
