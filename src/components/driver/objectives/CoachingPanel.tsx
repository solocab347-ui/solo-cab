import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DriverCoachingMessage, ObjectiveProgress } from './types';
import { 
  MilestoneTracker, 
  IntelligentCoach, 
  PartnershipPromotion,
  DailyMotivation 
} from './coaching';
import type { DriverStats, SoloCabFullStats } from '@/hooks/useDriverObjectives';
import { 
  Bot, 
  Trophy, 
  Handshake,
  Sparkles
} from 'lucide-react';

interface CoachingPanelProps {
  driverId: string;
  messages: DriverCoachingMessage[];
  progress: ObjectiveProgress[];
  driverStats: DriverStats;
  soloCabStats: SoloCabFullStats;
  isWorkingDay: boolean;
  driverName?: string;
  onMarkRead: (id: string) => Promise<void>;
}

export function CoachingPanel({ 
  driverId, 
  messages, 
  progress, 
  driverStats,
  soloCabStats,
  isWorkingDay,
  driverName,
  onMarkRead 
}: CoachingPanelProps) {
  const [activeTab, setActiveTab] = useState('coach');

  // Check for pending partner requests
  const hasPartnerRequests = false; // TODO: Implement when needed

  return (
    <div className="space-y-4">
      {/* Daily Motivation Banner */}
      <DailyMotivation
        progress={progress}
        isWorkingDay={isWorkingDay}
        streakDays={driverStats.streakDays}
        driverName={driverName}
      />

      {/* Coaching Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 h-auto p-1 bg-muted/50">
          <TabsTrigger 
            value="coach" 
            className="flex flex-col items-center gap-1 py-2 text-xs data-[state=active]:bg-background"
          >
            <Bot className="w-4 h-4" />
            <span>Coach IA</span>
          </TabsTrigger>
          <TabsTrigger 
            value="milestones" 
            className="flex flex-col items-center gap-1 py-2 text-xs data-[state=active]:bg-background"
          >
            <Trophy className="w-4 h-4" />
            <span>Succès</span>
          </TabsTrigger>
          <TabsTrigger 
            value="partnerships" 
            className="relative flex flex-col items-center gap-1 py-2 text-xs data-[state=active]:bg-background"
          >
            <Handshake className="w-4 h-4" />
            <span>Partenaires</span>
            {hasPartnerRequests && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coach" className="mt-4">
          <IntelligentCoach
            driverId={driverId}
            progress={progress}
            driverName={driverName}
            stats={driverStats}
            soloCabStats={soloCabStats}
          />
        </TabsContent>

        <TabsContent value="milestones" className="mt-4">
          <MilestoneTracker
            driverId={driverId}
            stats={driverStats}
          />
        </TabsContent>

        <TabsContent value="partnerships" className="mt-4">
          <PartnershipPromotion
            partnershipsCount={driverStats.partnershipsCount}
            hasPartnerRequests={hasPartnerRequests}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
