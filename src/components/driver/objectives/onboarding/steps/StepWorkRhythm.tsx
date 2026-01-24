import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Sun, Moon, Coffee } from 'lucide-react';
import type { OnboardingData } from '../OnboardingWizard';

interface StepWorkRhythmProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

const SCHEDULE_OPTIONS = [
  {
    id: 'early',
    title: 'Lève-tôt',
    description: '6h - 14h',
    icon: Sun,
    color: 'from-amber-500 to-orange-500'
  },
  {
    id: 'standard',
    title: 'Standard',
    description: '8h - 18h',
    icon: Coffee,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'late',
    title: 'Nocturne',
    description: '16h - 00h',
    icon: Moon,
    color: 'from-purple-500 to-indigo-500'
  },
  {
    id: 'flexible',
    title: 'Flexible',
    description: 'Variable selon les jours',
    icon: Clock,
    color: 'from-green-500 to-emerald-500'
  }
];

export function StepWorkRhythm({ data, onUpdate }: StepWorkRhythmProps) {
  const weeklyHours = data.workHoursPerDay * data.workDaysPerWeek;
  const monthlyHours = weeklyHours * 4;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold mb-2">Votre rythme de travail</h2>
        <p className="text-muted-foreground">
          Définissons un planning réaliste et adapté à votre vie
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Preferred Schedule */}
        <div className="space-y-3">
          <Label className="font-semibold">Votre créneau préféré</Label>
          <div className="grid grid-cols-2 gap-3">
            {SCHEDULE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = data.preferredSchedule === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => onUpdate({ preferredSchedule: option.id })}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${option.color} flex items-center justify-center mb-2`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-sm">{option.title}</h4>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hours per day */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <Label className="font-semibold">Heures par jour</Label>
                  <p className="text-xs text-muted-foreground">Temps de travail quotidien</p>
                </div>
              </div>
              <Badge className="text-lg font-bold bg-primary/10 text-primary">
                {data.workHoursPerDay}h
              </Badge>
            </div>
            <Slider
              value={[data.workHoursPerDay]}
              onValueChange={([v]) => onUpdate({ workHoursPerDay: v })}
              min={4}
              max={14}
              step={0.5}
              className="mt-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>4h (mi-temps)</span>
              <span>14h (intensif)</span>
            </div>
          </CardContent>
        </Card>

        {/* Days per week */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <Label className="font-semibold">Jours par semaine</Label>
                  <p className="text-xs text-muted-foreground">Nombre de jours travaillés</p>
                </div>
              </div>
              <Badge className="text-lg font-bold bg-primary/10 text-primary">
                {data.workDaysPerWeek}j
              </Badge>
            </div>
            <Slider
              value={[data.workDaysPerWeek]}
              onValueChange={([v]) => onUpdate({ workDaysPerWeek: v })}
              min={3}
              max={7}
              step={1}
              className="mt-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>3 jours</span>
              <span>7 jours</span>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Votre planning prévu</p>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div>
                  <span className="text-2xl font-bold text-primary">{weeklyHours}</span>
                  <span className="text-sm text-muted-foreground">h/semaine</span>
                </div>
                <div className="w-px h-8 bg-border" />
                <div>
                  <span className="text-2xl font-bold text-primary">{monthlyHours}</span>
                  <span className="text-sm text-muted-foreground">h/mois</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
