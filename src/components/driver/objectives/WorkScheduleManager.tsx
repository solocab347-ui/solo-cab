import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DriverWorkSchedule, DAYS_OF_WEEK } from './types';
import { toast } from 'sonner';
import { 
  Clock, 
  Save, 
  Loader2, 
  Calendar,
  LayoutTemplate,
  Copy,
  TrendingUp,
  Euro,
  Car,
  Users
} from 'lucide-react';
import { 
  ScheduleTemplates, 
  DayScheduleCard, 
  WeekCopier, 
  TodayStatusBanner,
  type DaySchedule 
} from './schedule';

interface WorkScheduleManagerProps {
  schedule: DriverWorkSchedule[];
  driverId?: string;
  onSave: (dayOfWeek: number, data: Partial<DriverWorkSchedule>) => Promise<any>;
  dailyProgress?: {
    revenue: number;
    courses: number;
    hours: number;
    revenueTarget: number;
    coursesTarget: number;
    hoursTarget: number;
  };
}

export function WorkScheduleManager({ schedule, onSave, dailyProgress }: WorkScheduleManagerProps) {
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [localSchedule, setLocalSchedule] = useState<Record<number, DaySchedule>>({});

  // Get today's day of week (0 = Sunday, 1 = Monday, etc.)
  const today = new Date().getDay();

  useEffect(() => {
    const initial: Record<number, DaySchedule> = {};
    for (let i = 0; i < 7; i++) {
      const existing = schedule.find(s => s.day_of_week === i);
      initial[i] = {
        is_working_day: existing?.is_working_day ?? (i !== 0), // Default: work Mon-Sat
        start_time: existing?.start_time || '08:00',
        end_time: existing?.end_time || '18:00',
        target_hours: existing?.target_hours || 8,
        target_revenue: existing?.target_revenue || 0,
        target_courses: existing?.target_courses || 0,
        target_clients: existing?.target_clients || 0,
        break_start: existing?.break_start || undefined,
        break_end: existing?.break_end || undefined,
        notes: existing?.notes || undefined,
      };
    }
    setLocalSchedule(initial);
  }, [schedule]);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < 7; i++) {
        await onSave(i, {
          is_working_day: localSchedule[i].is_working_day,
          start_time: localSchedule[i].start_time,
          end_time: localSchedule[i].end_time,
          target_hours: localSchedule[i].target_hours,
          target_revenue: localSchedule[i].target_revenue,
          target_courses: localSchedule[i].target_courses,
          target_clients: localSchedule[i].target_clients,
          break_start: localSchedule[i].break_start || null,
          break_end: localSchedule[i].break_end || null,
          notes: localSchedule[i].notes || null,
        });
      }
      toast.success('Planning enregistré avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (dayOfWeek: number, field: keyof DaySchedule, value: any) => {
    setLocalSchedule(prev => ({
      ...prev,
      [dayOfWeek]: { ...prev[dayOfWeek], [field]: value }
    }));
  };

  const applyTemplate = (template: Record<number, DaySchedule>) => {
    setLocalSchedule(template);
    toast.success('Modèle appliqué - N\'oubliez pas de sauvegarder');
  };

  const handleCopyWeek = async (targetWeekStart: Date) => {
    // In a real implementation, this would save the schedule for a specific week
    // For now, we just save the current schedule pattern
    await handleSaveAll();
  };

  // Calculate weekly totals
  const weeklyHours = Object.values(localSchedule).reduce((sum, day) => {
    return sum + (day.is_working_day ? day.target_hours : 0);
  }, 0);

  const weeklyRevenue = Object.values(localSchedule).reduce((sum, day) => {
    return sum + (day.is_working_day ? day.target_revenue : 0);
  }, 0);

  const weeklyCourses = Object.values(localSchedule).reduce((sum, day) => {
    return sum + (day.is_working_day ? day.target_courses : 0);
  }, 0);

  const weeklyClients = Object.values(localSchedule).reduce((sum, day) => {
    return sum + (day.is_working_day ? day.target_clients : 0);
  }, 0);

  const workingDays = Object.values(localSchedule).filter(d => d.is_working_day).length;
  const restDays = 7 - workingDays;

  // Get today's schedule
  const todaySchedule = localSchedule[today] || null;

  return (
    <div className="space-y-4">
      {/* Today Status Banner - Always visible */}
      <TodayStatusBanner 
        schedule={todaySchedule} 
        progress={dailyProgress}
      />

      {/* Summary Stats */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">Votre rythme de travail</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {workingDays} jours travaillés
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {restDays} jours de repos
                    </Badge>
                  </div>
                </div>
              </div>
              <Button onClick={handleSaveAll} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Sauvegarder
              </Button>
            </div>
            
            {/* Weekly Targets Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/50">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold">{weeklyHours}h</p>
                  <p className="text-[10px] text-muted-foreground">Heures/sem</p>
                </div>
              </div>
              
              {weeklyRevenue > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/50">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Euro className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{weeklyRevenue}€</p>
                    <p className="text-[10px] text-muted-foreground">CA/sem</p>
                  </div>
                </div>
              )}
              
              {weeklyCourses > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/50">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Car className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{weeklyCourses}</p>
                    <p className="text-[10px] text-muted-foreground">Courses/sem</p>
                  </div>
                </div>
              )}
              
              {weeklyClients > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/50">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{weeklyClients}</p>
                    <p className="text-[10px] text-muted-foreground">Démarchages/sem</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Planning</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            <span className="hidden sm:inline">Modèles</span>
          </TabsTrigger>
          <TabsTrigger value="copy" className="flex items-center gap-2">
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copier</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-4 space-y-2">
          {/* Days List - Reordered to start from Monday */}
          {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
            const daySchedule = localSchedule[dayIndex];
            if (!daySchedule) return null;
            
            return (
              <DayScheduleCard
                key={dayIndex}
                dayIndex={dayIndex}
                schedule={daySchedule}
                onUpdate={(field, value) => updateDay(dayIndex, field, value)}
                isToday={dayIndex === today}
              />
            );
          })}
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <ScheduleTemplates onApplyTemplate={applyTemplate} />
        </TabsContent>

        <TabsContent value="copy" className="mt-4">
          <WeekCopier onCopyWeek={handleCopyWeek} />
        </TabsContent>
      </Tabs>

      {/* Tips Card */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm mb-2">💡 Conseils pour optimiser votre planning</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>Créneaux rentables:</strong> 7h-9h (trajets domicile-travail) et 17h-20h (retours)</li>
                <li>• <strong>Weekends:</strong> Vendredi et samedi soirs sont les plus actifs</li>
                <li>• <strong>Repos:</strong> Gardez au moins 1 jour complet de repos par semaine</li>
                <li>• <strong>Pauses:</strong> Prévoyez des pauses régulières pour rester alerte</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
