import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Clock, 
  Coffee, 
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Palmtree
} from 'lucide-react';
import { useState } from 'react';
import { DAYS_OF_WEEK } from '../types';

interface DaySchedule {
  is_working_day: boolean;
  start_time: string;
  end_time: string;
  target_hours: number;
  break_start?: string;
  break_end?: string;
}

interface DayScheduleCardProps {
  dayIndex: number;
  schedule: DaySchedule;
  onUpdate: (field: keyof DaySchedule, value: any) => void;
  isToday?: boolean;
}

export function DayScheduleCard({ dayIndex, schedule, onUpdate, isToday }: DayScheduleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const dayName = DAYS_OF_WEEK[dayIndex];
  const hasBreak = schedule.break_start && schedule.break_end;
  
  // Calculate actual working hours
  const calculateHours = () => {
    if (!schedule.is_working_day) return 0;
    
    const start = schedule.start_time.split(':').map(Number);
    const end = schedule.end_time.split(':').map(Number);
    
    let startMinutes = start[0] * 60 + start[1];
    let endMinutes = end[0] * 60 + end[1];
    
    // Handle overnight shifts
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    let totalMinutes = endMinutes - startMinutes;
    
    // Subtract break time
    if (hasBreak && schedule.break_start && schedule.break_end) {
      const breakStart = schedule.break_start.split(':').map(Number);
      const breakEnd = schedule.break_end.split(':').map(Number);
      const breakMinutes = (breakEnd[0] * 60 + breakEnd[1]) - (breakStart[0] * 60 + breakStart[1]);
      if (breakMinutes > 0) {
        totalMinutes -= breakMinutes;
      }
    }
    
    return Math.round(totalMinutes / 60 * 10) / 10;
  };
  
  const calculatedHours = calculateHours();
  
  // Determine shift type for icon
  const getShiftType = () => {
    if (!schedule.is_working_day) return 'rest';
    const startHour = parseInt(schedule.start_time.split(':')[0]);
    if (startHour < 10) return 'morning';
    if (startHour >= 16) return 'evening';
    return 'day';
  };
  
  const shiftType = getShiftType();
  const ShiftIcon = shiftType === 'rest' ? Palmtree : shiftType === 'morning' ? Sun : shiftType === 'evening' ? Moon : Clock;
  
  return (
    <Card className={`transition-all ${
      !schedule.is_working_day 
        ? 'bg-muted/30 border-dashed' 
        : isToday 
          ? 'ring-2 ring-primary/50 bg-primary/5' 
          : ''
    }`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            {/* Day Toggle & Name */}
            <div className="flex items-center gap-3 min-w-[140px]">
              <Switch
                checked={schedule.is_working_day}
                onCheckedChange={(checked) => onUpdate('is_working_day', checked)}
              />
              <div className="flex items-center gap-2">
                <ShiftIcon className={`w-4 h-4 ${
                  !schedule.is_working_day 
                    ? 'text-muted-foreground' 
                    : shiftType === 'morning' 
                      ? 'text-amber-500' 
                      : shiftType === 'evening' 
                        ? 'text-purple-500' 
                        : 'text-blue-500'
                }`} />
                <span className={`font-medium ${!schedule.is_working_day ? 'text-muted-foreground' : ''}`}>
                  {dayName}
                </span>
                {isToday && (
                  <Badge className="text-[10px] py-0 px-1.5 bg-primary/20 text-primary border-0">
                    Aujourd'hui
                  </Badge>
                )}
              </div>
            </div>
            
            {schedule.is_working_day ? (
              <>
                {/* Time Range (Desktop) */}
                <div className="hidden md:flex items-center gap-2 flex-1">
                  <Input
                    type="time"
                    value={schedule.start_time}
                    onChange={(e) => onUpdate('start_time', e.target.value)}
                    className="w-[100px] h-8 text-sm"
                  />
                  <span className="text-muted-foreground text-sm">→</span>
                  <Input
                    type="time"
                    value={schedule.end_time}
                    onChange={(e) => onUpdate('end_time', e.target.value)}
                    className="w-[100px] h-8 text-sm"
                  />
                  
                  {hasBreak && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Coffee className="w-3 h-3" />
                      {schedule.break_start}-{schedule.break_end}
                    </Badge>
                  )}
                </div>
                
                {/* Hours Badge */}
                <Badge className={`text-xs ${
                  calculatedHours >= 10 ? 'bg-amber-500/20 text-amber-600 border-amber-500/30' :
                  calculatedHours >= 8 ? 'bg-green-500/20 text-green-600 border-green-500/30' :
                  'bg-blue-500/20 text-blue-600 border-blue-500/30'
                }`}>
                  {calculatedHours}h
                </Badge>
                
                {/* Expand Button */}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm text-muted-foreground italic">Jour de repos</span>
                <Badge variant="secondary" className="text-xs">
                  <Palmtree className="w-3 h-3 mr-1" />
                  Repos
                </Badge>
              </div>
            )}
          </div>
          
          {/* Mobile Time Controls */}
          {schedule.is_working_day && (
            <div className="md:hidden mt-3 flex items-center gap-2">
              <Input
                type="time"
                value={schedule.start_time}
                onChange={(e) => onUpdate('start_time', e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <span className="text-muted-foreground text-sm">→</span>
              <Input
                type="time"
                value={schedule.end_time}
                onChange={(e) => onUpdate('end_time', e.target.value)}
                className="flex-1 h-8 text-sm"
              />
            </div>
          )}
          
          {/* Expanded Content */}
          <CollapsibleContent>
            {schedule.is_working_day && (
              <div className="mt-4 pt-4 border-t space-y-4">
                {/* Break Time */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-muted-foreground" />
                    Pause déjeuner
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={schedule.break_start || ''}
                      onChange={(e) => onUpdate('break_start', e.target.value)}
                      placeholder="Début"
                      className="w-[110px] h-8 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">→</span>
                    <Input
                      type="time"
                      value={schedule.break_end || ''}
                      onChange={(e) => onUpdate('break_end', e.target.value)}
                      placeholder="Fin"
                      className="w-[110px] h-8 text-sm"
                    />
                    {hasBreak && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-muted-foreground"
                        onClick={() => {
                          onUpdate('break_start', '');
                          onUpdate('break_end', '');
                        }}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Target Hours Override */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Objectif heures (optionnel)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={schedule.target_hours}
                      onChange={(e) => onUpdate('target_hours', parseFloat(e.target.value) || 0)}
                      className="w-[100px] h-8 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">
                      heures (calculé: {calculatedHours}h)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

export type { DaySchedule };
