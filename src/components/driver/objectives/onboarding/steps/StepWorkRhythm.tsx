import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Clock, Calendar, Sun, Moon, Coffee, Sparkles, Check } from 'lucide-react';
import type { OnboardingData } from '../OnboardingWizard';

interface StepWorkRhythmProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

interface DaySchedule {
  dayIndex: number;
  label: string;
  shortLabel: string;
  isWorking: boolean;
  startTime: string;
  endTime: string;
}

const PRESET_SCHEDULES = [
  {
    id: 'standard',
    title: '🏢 Standard',
    description: 'Lun-Ven, 8h-18h',
    icon: Coffee,
    days: [false, true, true, true, true, true, false],
    startTime: '08:00',
    endTime: '18:00',
  },
  {
    id: 'early',
    title: '🌅 Lève-tôt',
    description: 'Lun-Ven, 6h-14h',
    icon: Sun,
    days: [false, true, true, true, true, true, false],
    startTime: '06:00',
    endTime: '14:00',
  },
  {
    id: 'late',
    title: '🌙 Nocturne',
    description: 'Lun-Sam, 16h-00h',
    icon: Moon,
    days: [false, true, true, true, true, true, true],
    startTime: '16:00',
    endTime: '00:00',
  },
  {
    id: 'weekend',
    title: '📅 Week-end inclus',
    description: 'Tous les jours',
    icon: Calendar,
    days: [true, true, true, true, true, true, true],
    startTime: '09:00',
    endTime: '19:00',
  },
];

const DAYS_OF_WEEK = [
  { index: 0, label: 'Dimanche', shortLabel: 'Dim' },
  { index: 1, label: 'Lundi', shortLabel: 'Lun' },
  { index: 2, label: 'Mardi', shortLabel: 'Mar' },
  { index: 3, label: 'Mercredi', shortLabel: 'Mer' },
  { index: 4, label: 'Jeudi', shortLabel: 'Jeu' },
  { index: 5, label: 'Vendredi', shortLabel: 'Ven' },
  { index: 6, label: 'Samedi', shortLabel: 'Sam' },
];

export function StepWorkRhythm({ data, onUpdate }: StepWorkRhythmProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(data.preferredSchedule || null);
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>(
    data.weekSchedule || DAYS_OF_WEEK.map(day => ({
      dayIndex: day.index,
      label: day.label,
      shortLabel: day.shortLabel,
      isWorking: day.index >= 1 && day.index <= 5,
      startTime: '08:00',
      endTime: '18:00',
    }))
  );

  const applyPreset = (presetId: string) => {
    const preset = PRESET_SCHEDULES.find(p => p.id === presetId);
    if (!preset) return;

    setSelectedPreset(presetId);
    
    const newSchedule = DAYS_OF_WEEK.map((day, idx) => ({
      dayIndex: day.index,
      label: day.label,
      shortLabel: day.shortLabel,
      isWorking: preset.days[idx],
      startTime: preset.startTime,
      endTime: preset.endTime,
    }));
    
    setWeekSchedule(newSchedule);
    
    const workingDays = preset.days.filter(d => d).length;
    const hoursPerDay = calculateHours(preset.startTime, preset.endTime);
    
    onUpdate({
      preferredSchedule: presetId,
      workDaysPerWeek: workingDays,
      workHoursPerDay: hoursPerDay,
      weekSchedule: newSchedule,
    });
  };

  const calculateHours = (start: string, end: string): number => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let hours = endH - startH + (endM - startM) / 60;
    if (hours < 0) hours += 24; // Handle overnight shifts
    return Math.max(1, hours);
  };

  const updateDaySchedule = (dayIndex: number, field: keyof DaySchedule, value: any) => {
    const newSchedule = weekSchedule.map(day => 
      day.dayIndex === dayIndex ? { ...day, [field]: value } : day
    );
    setWeekSchedule(newSchedule);
    
    const workingDays = newSchedule.filter(d => d.isWorking).length;
    const workingDaysData = newSchedule.filter(d => d.isWorking);
    const avgHours = workingDaysData.length > 0
      ? workingDaysData.reduce((sum, d) => sum + calculateHours(d.startTime, d.endTime), 0) / workingDaysData.length
      : 8;
    
    setSelectedPreset(null);
    onUpdate({
      preferredSchedule: 'custom',
      workDaysPerWeek: workingDays,
      workHoursPerDay: Math.round(avgHours * 10) / 10,
      weekSchedule: newSchedule,
    });
  };

  const workingDaysCount = weekSchedule.filter(d => d.isWorking).length;
  const workingDaysData = weekSchedule.filter(d => d.isWorking);
  const totalWeeklyHours = workingDaysData.reduce((sum, d) => sum + calculateHours(d.startTime, d.endTime), 0);
  const avgHoursPerDay = workingDaysData.length > 0 ? totalWeeklyHours / workingDaysData.length : 0;

  // Reorder days to start with Monday
  const orderedDays = [...weekSchedule.slice(1), weekSchedule[0]];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">Votre planning de travail</h2>
        <p className="text-muted-foreground text-sm">
          Définissez votre semaine type pour que l'IA adapte ses conseils
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center gap-2 mb-4">
        <Button
          variant={mode === 'preset' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('preset')}
        >
          <Sparkles className="w-4 h-4 mr-1" />
          Semaine type
        </Button>
        <Button
          variant={mode === 'custom' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('custom')}
        >
          <Calendar className="w-4 h-4 mr-1" />
          Personnalisé
        </Button>
      </div>

      {mode === 'preset' ? (
        /* Preset Schedules */
        <div className="grid grid-cols-2 gap-3">
          {PRESET_SCHEDULES.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPreset === preset.id;
            
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold text-sm">{preset.title}</h4>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </button>
            );
          })}
        </div>
      ) : (
        /* Custom Schedule */
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <Label className="font-semibold">Configurez chaque jour</Label>
            </div>
            
            {orderedDays.map((day) => (
              <div
                key={day.dayIndex}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  day.isWorking
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-muted/30 border-border'
                }`}
              >
                {/* Day toggle */}
                <Switch
                  checked={day.isWorking}
                  onCheckedChange={(checked) => updateDaySchedule(day.dayIndex, 'isWorking', checked)}
                />
                
                {/* Day label */}
                <div className="w-16">
                  <span className={`font-medium text-sm ${!day.isWorking && 'text-muted-foreground'}`}>
                    {day.shortLabel}
                  </span>
                </div>
                
                {/* Time inputs */}
                {day.isWorking ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={day.startTime}
                      onChange={(e) => updateDaySchedule(day.dayIndex, 'startTime', e.target.value)}
                      className="w-24 h-8 text-xs"
                    />
                    <span className="text-muted-foreground text-xs">à</span>
                    <Input
                      type="time"
                      value={day.endTime}
                      onChange={(e) => updateDaySchedule(day.dayIndex, 'endTime', e.target.value)}
                      className="w-24 h-8 text-xs"
                    />
                    <Badge variant="outline" className="ml-auto text-xs">
                      {calculateHours(day.startTime, day.endTime)}h
                    </Badge>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Repos</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Votre planning prévu</p>
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <span className="text-2xl font-bold text-primary">{workingDaysCount}</span>
                <span className="text-sm text-muted-foreground block">jours/sem</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <span className="text-2xl font-bold text-primary">{Math.round(avgHoursPerDay)}</span>
                <span className="text-sm text-muted-foreground block">h/jour</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <span className="text-2xl font-bold text-primary">{Math.round(totalWeeklyHours)}</span>
                <span className="text-sm text-muted-foreground block">h/sem</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
