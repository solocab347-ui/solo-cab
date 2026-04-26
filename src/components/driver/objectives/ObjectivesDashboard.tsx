import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDriverObjectives } from '@/hooks/useDriverObjectives';
import { DailyMotivation } from './coaching';
import { QuickPlatformEntry } from './QuickPlatformEntry';
import { InlineProgressCards } from './InlineProgressCards';
import { InlineObjectivesEditor } from './InlineObjectivesEditor';
import { CoachingPanel } from './CoachingPanel';
import { ObjectivesHistory } from './ObjectivesHistory';
import { IndependenceFunnel } from './IndependenceFunnel';
import { 
  Target, 
  MessageSquare,
  History,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ObjectivesDashboardProps {
  driverId: string;
  driverName?: string;
}

export function ObjectivesDashboard({ driverId, driverName }: ObjectivesDashboardProps) {
  const hook = useDriverObjectives(driverId);
  const [showCoaching, setShowCoaching] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const unreadMessages = hook.coachingMessages.filter(m => !m.is_read).length;

  if (hook.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const today = new Date().getDay();
  const todayScheduleData = hook.schedule.find(s => s.day_of_week === today);
  const isWorkingDay = todayScheduleData?.is_working_day ?? true;

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Daily Motivation — always visible */}
      <DailyMotivation
        progress={hook.progress}
        isWorkingDay={isWorkingDay}
        streakDays={hook.driverStats.streakDays}
        driverName={driverName}
        onOpenCoach={() => setShowCoaching(true)}
      />

      {/* 2. ⭐ FUNNEL D'INDÉPENDANCE — héros : ce qui compte vraiment */}
      <IndependenceFunnel
        period="weekly"
        entries={hook.dailyEntries}
        objectives={hook.objectives}
        soloCabStats={hook.soloCabFullStats.week}
        totalDirectClients={hook.driverStats.totalClients}
        loyalClientsCount={Math.floor(hook.driverStats.totalClients * 0.3)}
      />

      {/* 3. Quick Daily Input — saisir l'activité (incl. tracking acquisition) */}
      <QuickPlatformEntry
        driverId={driverId}
        onEntrySaved={() => hook.fetchAll?.()}
      />

      {/* 4. Progress Overview — cibles CA en conséquence */}
      <InlineProgressCards progress={hook.progress} driverId={driverId} />

      {/* 5. Inline Objectives Editor — edit in place */}
      <InlineObjectivesEditor
        driverId={driverId}
        onUpdate={() => hook.fetchAll?.()}
      />

      {/* 5. Collapsible Coach Section */}
      <CollapsibleSection
        title="Coach IA"
        icon={<MessageSquare className="w-4 h-4" />}
        badge={unreadMessages > 0 ? unreadMessages : undefined}
        open={showCoaching}
        onToggle={() => setShowCoaching(v => !v)}
      >
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
      </CollapsibleSection>

      {/* 6. Collapsible History */}
      <CollapsibleSection
        title="Historique"
        icon={<History className="w-4 h-4" />}
        open={showHistory}
        onToggle={() => setShowHistory(v => !v)}
      >
        <ObjectivesHistory 
          entries={hook.dailyEntries}
          platforms={hook.platforms}
        />
      </CollapsibleSection>
    </div>
  );
}

// Reusable collapsible section
function CollapsibleSection({ 
  title, icon, badge, open, onToggle, children 
}: { 
  title: string; 
  icon: React.ReactNode; 
  badge?: number;
  open: boolean; 
  onToggle: () => void; 
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors touch-manipulation"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          {badge && badge > 0 && (
            <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-destructive text-destructive-foreground">
              {badge}
            </Badge>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
