import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DriverWorkSchedule, DAYS_OF_WEEK } from './types';
import { toast } from 'sonner';
import { Clock, Save, Loader2 } from 'lucide-react';

interface WorkScheduleManagerProps {
  schedule: DriverWorkSchedule[];
  onSave: (dayOfWeek: number, data: Partial<DriverWorkSchedule>) => Promise<any>;
}

interface DaySchedule {
  is_working_day: boolean;
  start_time: string;
  end_time: string;
  target_hours: number;
}

export function WorkScheduleManager({ schedule, onSave }: WorkScheduleManagerProps) {
  const [saving, setSaving] = useState<number | null>(null);
  const [localSchedule, setLocalSchedule] = useState<Record<number, DaySchedule>>({});

  useEffect(() => {
    const initial: Record<number, DaySchedule> = {};
    for (let i = 0; i < 7; i++) {
      const existing = schedule.find(s => s.day_of_week === i);
      initial[i] = {
        is_working_day: existing?.is_working_day ?? (i !== 0), // Default: work Mon-Sat
        start_time: existing?.start_time || '08:00',
        end_time: existing?.end_time || '18:00',
        target_hours: existing?.target_hours || 8,
      };
    }
    setLocalSchedule(initial);
  }, [schedule]);

  const handleSaveDay = async (dayOfWeek: number) => {
    setSaving(dayOfWeek);
    try {
      await onSave(dayOfWeek, localSchedule[dayOfWeek]);
      toast.success(`${DAYS_OF_WEEK[dayOfWeek]} enregistré`);
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    setSaving(-1);
    try {
      for (let i = 0; i < 7; i++) {
        await onSave(i, localSchedule[i]);
      }
      toast.success('Planning enregistré');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(null);
    }
  };

  const updateDay = (dayOfWeek: number, field: keyof DaySchedule, value: any) => {
    setLocalSchedule(prev => ({
      ...prev,
      [dayOfWeek]: { ...prev[dayOfWeek], [field]: value }
    }));
  };

  // Calculate weekly totals
  const weeklyHours = Object.values(localSchedule).reduce((sum, day) => {
    return sum + (day.is_working_day ? day.target_hours : 0);
  }, 0);

  const workingDays = Object.values(localSchedule).filter(d => d.is_working_day).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Planning hebdomadaire</h4>
                <p className="text-sm text-muted-foreground">
                  {workingDays} jours • {weeklyHours}h/semaine
                </p>
              </div>
            </div>
            <Button onClick={handleSaveAll} disabled={saving !== null}>
              {saving === -1 ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Tout enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Days */}
      <div className="space-y-3">
        {DAYS_OF_WEEK.map((dayName, index) => {
          const day = localSchedule[index];
          if (!day) return null;

          return (
            <Card key={index} className={!day.is_working_day ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Day Toggle */}
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <Switch
                      checked={day.is_working_day}
                      onCheckedChange={(checked) => updateDay(index, 'is_working_day', checked)}
                    />
                    <span className={`font-medium ${day.is_working_day ? '' : 'text-muted-foreground'}`}>
                      {dayName}
                    </span>
                  </div>

                  {day.is_working_day && (
                    <>
                      {/* Time Range */}
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">De</Label>
                          <Input
                            type="time"
                            value={day.start_time}
                            onChange={(e) => updateDay(index, 'start_time', e.target.value)}
                            className="w-[110px]"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">à</Label>
                          <Input
                            type="time"
                            value={day.end_time}
                            onChange={(e) => updateDay(index, 'end_time', e.target.value)}
                            className="w-[110px]"
                          />
                        </div>
                      </div>

                      {/* Target Hours */}
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Objectif</Label>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={day.target_hours}
                          onChange={(e) => updateDay(index, 'target_hours', parseFloat(e.target.value) || 0)}
                          className="w-[80px]"
                        />
                        <span className="text-sm text-muted-foreground">h</span>
                      </div>

                      {/* Save Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveDay(index)}
                        disabled={saving !== null}
                      >
                        {saving === index ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tips */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <h4 className="font-semibold text-sm mb-2">💡 Conseils planning</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Définissez des horaires réalistes pour éviter la fatigue</li>
            <li>• Prévoyez des pauses régulières toutes les 2-3 heures</li>
            <li>• Les créneaux 7h-9h et 17h-20h sont souvent les plus rentables</li>
            <li>• Gardez au moins un jour de repos par semaine</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
