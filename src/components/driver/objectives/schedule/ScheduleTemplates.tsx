import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Briefcase, 
  Coffee, 
  Sun, 
  Moon, 
  Zap,
  Copy
} from 'lucide-react';

interface DaySchedule {
  is_working_day: boolean;
  start_time: string;
  end_time: string;
  target_hours: number;
  break_start?: string;
  break_end?: string;
}

interface ScheduleTemplatesProps {
  onApplyTemplate: (template: Record<number, DaySchedule>) => void;
}

const TEMPLATES = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Lun-Ven, 8h-18h',
    icon: Briefcase,
    color: 'from-blue-500 to-cyan-500',
    schedule: {
      0: { is_working_day: false, start_time: '08:00', end_time: '18:00', target_hours: 0 },
      1: { is_working_day: true, start_time: '08:00', end_time: '18:00', target_hours: 9, break_start: '12:00', break_end: '13:00' },
      2: { is_working_day: true, start_time: '08:00', end_time: '18:00', target_hours: 9, break_start: '12:00', break_end: '13:00' },
      3: { is_working_day: true, start_time: '08:00', end_time: '18:00', target_hours: 9, break_start: '12:00', break_end: '13:00' },
      4: { is_working_day: true, start_time: '08:00', end_time: '18:00', target_hours: 9, break_start: '12:00', break_end: '13:00' },
      5: { is_working_day: true, start_time: '08:00', end_time: '18:00', target_hours: 9, break_start: '12:00', break_end: '13:00' },
      6: { is_working_day: false, start_time: '08:00', end_time: '18:00', target_hours: 0 },
    }
  },
  {
    id: 'early_bird',
    name: 'Lève-tôt',
    description: 'Lun-Sam, 6h-14h',
    icon: Sun,
    color: 'from-amber-500 to-orange-500',
    schedule: {
      0: { is_working_day: false, start_time: '06:00', end_time: '14:00', target_hours: 0 },
      1: { is_working_day: true, start_time: '06:00', end_time: '14:00', target_hours: 7, break_start: '10:00', break_end: '10:30' },
      2: { is_working_day: true, start_time: '06:00', end_time: '14:00', target_hours: 7, break_start: '10:00', break_end: '10:30' },
      3: { is_working_day: true, start_time: '06:00', end_time: '14:00', target_hours: 7, break_start: '10:00', break_end: '10:30' },
      4: { is_working_day: true, start_time: '06:00', end_time: '14:00', target_hours: 7, break_start: '10:00', break_end: '10:30' },
      5: { is_working_day: true, start_time: '06:00', end_time: '14:00', target_hours: 7, break_start: '10:00', break_end: '10:30' },
      6: { is_working_day: true, start_time: '06:00', end_time: '12:00', target_hours: 5 },
    }
  },
  {
    id: 'night_owl',
    name: 'Nocturne',
    description: 'Mar-Sam, 16h-00h',
    icon: Moon,
    color: 'from-purple-500 to-indigo-500',
    schedule: {
      0: { is_working_day: false, start_time: '16:00', end_time: '00:00', target_hours: 0 },
      1: { is_working_day: false, start_time: '16:00', end_time: '00:00', target_hours: 0 },
      2: { is_working_day: true, start_time: '16:00', end_time: '00:00', target_hours: 7, break_start: '20:00', break_end: '20:30' },
      3: { is_working_day: true, start_time: '16:00', end_time: '00:00', target_hours: 7, break_start: '20:00', break_end: '20:30' },
      4: { is_working_day: true, start_time: '16:00', end_time: '00:00', target_hours: 7, break_start: '20:00', break_end: '20:30' },
      5: { is_working_day: true, start_time: '16:00', end_time: '02:00', target_hours: 9, break_start: '20:00', break_end: '20:30' },
      6: { is_working_day: true, start_time: '18:00', end_time: '03:00', target_hours: 8, break_start: '22:00', break_end: '22:30' },
    }
  },
  {
    id: 'intensive',
    name: 'Intensif',
    description: 'Lun-Dim, 10h/jour',
    icon: Zap,
    color: 'from-red-500 to-pink-500',
    schedule: {
      0: { is_working_day: true, start_time: '08:00', end_time: '20:00', target_hours: 10, break_start: '13:00', break_end: '14:00' },
      1: { is_working_day: true, start_time: '07:00', end_time: '19:00', target_hours: 10, break_start: '12:00', break_end: '13:00' },
      2: { is_working_day: true, start_time: '07:00', end_time: '19:00', target_hours: 10, break_start: '12:00', break_end: '13:00' },
      3: { is_working_day: true, start_time: '07:00', end_time: '19:00', target_hours: 10, break_start: '12:00', break_end: '13:00' },
      4: { is_working_day: true, start_time: '07:00', end_time: '19:00', target_hours: 10, break_start: '12:00', break_end: '13:00' },
      5: { is_working_day: true, start_time: '07:00', end_time: '21:00', target_hours: 12, break_start: '13:00', break_end: '14:00' },
      6: { is_working_day: true, start_time: '08:00', end_time: '22:00', target_hours: 12, break_start: '14:00', break_end: '15:00' },
    }
  },
  {
    id: 'relaxed',
    name: 'Équilibré',
    description: 'Lun-Jeu, horaires flexibles',
    icon: Coffee,
    color: 'from-green-500 to-emerald-500',
    schedule: {
      0: { is_working_day: false, start_time: '09:00', end_time: '17:00', target_hours: 0 },
      1: { is_working_day: true, start_time: '09:00', end_time: '17:00', target_hours: 7, break_start: '12:30', break_end: '13:30' },
      2: { is_working_day: true, start_time: '09:00', end_time: '18:00', target_hours: 8, break_start: '12:30', break_end: '13:30' },
      3: { is_working_day: true, start_time: '09:00', end_time: '18:00', target_hours: 8, break_start: '12:30', break_end: '13:30' },
      4: { is_working_day: true, start_time: '09:00', end_time: '17:00', target_hours: 7, break_start: '12:30', break_end: '13:30' },
      5: { is_working_day: false, start_time: '09:00', end_time: '17:00', target_hours: 0 },
      6: { is_working_day: false, start_time: '09:00', end_time: '17:00', target_hours: 0 },
    }
  },
  {
    id: 'flexible',
    name: 'Flexible',
    description: 'Personnalisé par jour',
    icon: Clock,
    color: 'from-teal-500 to-cyan-500',
    isCustom: true,
    schedule: {
      0: { is_working_day: false, start_time: '09:00', end_time: '17:00', target_hours: 0 },
      1: { is_working_day: true, start_time: '08:00', end_time: '18:00', target_hours: 9, break_start: '12:00', break_end: '13:00' },
      2: { is_working_day: true, start_time: '08:00', end_time: '18:00', target_hours: 9, break_start: '12:00', break_end: '13:00' },
      3: { is_working_day: true, start_time: '08:00', end_time: '18:00', target_hours: 9, break_start: '12:00', break_end: '13:00' },
      4: { is_working_day: true, start_time: '08:00', end_time: '18:00', target_hours: 9, break_start: '12:00', break_end: '13:00' },
      5: { is_working_day: true, start_time: '08:00', end_time: '18:00', target_hours: 9, break_start: '12:00', break_end: '13:00' },
      6: { is_working_day: false, start_time: '09:00', end_time: '17:00', target_hours: 0 },
    }
  },
];

export function ScheduleTemplates({ onApplyTemplate }: ScheduleTemplatesProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Copy className="w-4 h-4 text-primary" />
          Modèles de planning
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TEMPLATES.map((template) => {
            const Icon = template.icon;
            const totalHours = Object.values(template.schedule).reduce(
              (sum, day) => sum + (day.is_working_day ? day.target_hours : 0), 0
            );
            const workingDays = Object.values(template.schedule).filter(d => d.is_working_day).length;
            const isCustom = 'isCustom' in template && template.isCustom;
            
            return (
              <button
                key={template.id}
                onClick={() => onApplyTemplate(template.schedule)}
                className={`group relative p-4 rounded-xl border-2 transition-all text-left bg-card hover:bg-accent/5 ${
                  isCustom 
                    ? 'border-primary/50 hover:border-primary ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${template.color} opacity-0 group-hover:opacity-5 rounded-xl transition-opacity`} />
                {isCustom && (
                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-medium">
                    Recommandé
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">{template.name}</h4>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {workingDays}j
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {totalHours}h/sem
                      </Badge>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          💡 Sélectionnez "Flexible" pour personnaliser chaque jour individuellement
        </p>
      </CardContent>
    </Card>
  );
}

export { TEMPLATES };
export type { DaySchedule };
