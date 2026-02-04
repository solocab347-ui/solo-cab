import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDriverObjectives } from '@/hooks/useDriverObjectives';
import { ObjectivesOverview } from './ObjectivesOverview';
import { ObjectivesEditor } from './ObjectivesEditor';
import { DailyActivityInput } from './DailyActivityInput';
import { PlatformsManager } from './PlatformsManager';
import { WorkScheduleManager } from './WorkScheduleManager';
import { CoachingPanel } from './CoachingPanel';
import { ObjectivesHistory } from './ObjectivesHistory';
import { DailyMotivation } from './coaching';
import { 
  Target, 
  Calendar, 
  PlusCircle, 
  Settings2, 
  Clock, 
  MessageSquare,
  History,
  Loader2,
  Edit3
} from 'lucide-react';

interface ObjectivesDashboardProps {
  driverId: string;
  driverName?: string;
}

export function ObjectivesDashboard({ driverId, driverName }: ObjectivesDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const hook = useDriverObjectives(driverId);
  
  const unreadMessages = hook.coachingMessages.filter(m => !m.is_read).length;

  // Loading state
  if (hook.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get today's schedule and progress for the status banner
  const today = new Date().getDay();
  const todayScheduleData = hook.schedule.find(s => s.day_of_week === today);
  const isWorkingDay = todayScheduleData?.is_working_day ?? true;

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
                className="flex-1 min-w-[80px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <Target className="h-4 w-4" />
                <span className="text-[10px] font-medium">Aperçu</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="entry" 
                className="flex-1 min-w-[80px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="text-[10px] font-medium">Activité</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="setup" 
                className="flex-1 min-w-[80px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <Edit3 className="h-4 w-4" />
                <span className="text-[10px] font-medium">Objectifs</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="schedule" 
                className="flex-1 min-w-[80px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <Clock className="h-4 w-4" />
                <span className="text-[10px] font-medium">Planning</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="platforms" 
                className="flex-1 min-w-[80px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <Calendar className="h-4 w-4" />
                <span className="text-[10px] font-medium">Plateformes</span>
              </TabsTrigger>
              
              <TabsTrigger 
                value="coaching" 
                className="relative flex-1 min-w-[80px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-[10px] font-medium">Coach</span>
                {unreadMessages > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] bg-destructive">
                    {unreadMessages}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger 
                value="history" 
                className="flex-1 min-w-[80px] flex flex-col items-center gap-1 py-2 px-2 rounded-lg data-[state=active]:bg-primary/10"
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
          <DailyActivityInput 
            driverId={driverId}
            platforms={hook.platforms}
            onEntryUpdated={() => hook.fetchAll?.()}
          />
        </TabsContent>
        
        <TabsContent value="setup" className="mt-4">
          <ObjectivesEditor 
            driverId={driverId}
            onUpdate={() => hook.fetchAll?.()}
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
