import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  CalendarDays,
  CalendarRange
} from 'lucide-react';
import { format, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachWeekOfInterval, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface WeekCopierProps {
  onCopyWeek: (targetWeekStart: Date) => Promise<void>;
}

export function WeekCopier({ onCopyWeek }: WeekCopierProps) {
  const [selectedWeeks, setSelectedWeeks] = useState<Date[]>([]);
  const [copying, setCopying] = useState(false);
  const [viewOffset, setViewOffset] = useState(0);
  const [copyMode, setCopyMode] = useState<'weeks' | 'month' | 'year'>('weeks');
  
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  
  // Generate next 4 weeks from view offset
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const weekStart = addWeeks(currentWeekStart, viewOffset + i + 1);
    return {
      start: weekStart,
      end: endOfWeek(weekStart, { weekStartsOn: 1 }),
      isSelected: selectedWeeks.some(w => w.getTime() === weekStart.getTime())
    };
  });

  // Generate next 6 months
  const months = Array.from({ length: 6 }, (_, i) => {
    const monthStart = startOfMonth(addMonths(today, i + 1));
    const monthEnd = endOfMonth(monthStart);
    const weeksInMonth = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
    return {
      start: monthStart,
      end: monthEnd,
      weeks: weeksInMonth,
      label: format(monthStart, 'MMMM yyyy', { locale: fr }),
      isSelected: weeksInMonth.every(w => selectedWeeks.some(sw => sw.getTime() === w.getTime()))
    };
  });

  // Current year remaining weeks
  const yearEnd = endOfYear(today);
  const remainingWeeksOfYear = eachWeekOfInterval({ start: addWeeks(currentWeekStart, 1), end: yearEnd }, { weekStartsOn: 1 });
  
  const toggleWeek = (weekStart: Date) => {
    setSelectedWeeks(prev => {
      const exists = prev.some(w => w.getTime() === weekStart.getTime());
      if (exists) {
        return prev.filter(w => w.getTime() !== weekStart.getTime());
      }
      return [...prev, weekStart];
    });
  };

  const selectMonth = (monthWeeks: Date[]) => {
    const allSelected = monthWeeks.every(w => selectedWeeks.some(sw => sw.getTime() === w.getTime()));
    if (allSelected) {
      setSelectedWeeks(prev => prev.filter(sw => !monthWeeks.some(mw => mw.getTime() === sw.getTime())));
    } else {
      setSelectedWeeks(prev => {
        const newWeeks = monthWeeks.filter(mw => !prev.some(pw => pw.getTime() === mw.getTime()));
        return [...prev, ...newWeeks];
      });
    }
  };

  const selectYear = () => {
    const allSelected = remainingWeeksOfYear.every(w => selectedWeeks.some(sw => sw.getTime() === w.getTime()));
    if (allSelected) {
      setSelectedWeeks([]);
    } else {
      setSelectedWeeks(remainingWeeksOfYear);
    }
  };
  
  const handleCopy = async () => {
    if (selectedWeeks.length === 0) {
      toast.error('Sélectionnez au moins une semaine');
      return;
    }
    
    setCopying(true);
    try {
      for (const weekStart of selectedWeeks) {
        await onCopyWeek(weekStart);
      }
      toast.success(`Planning copié sur ${selectedWeeks.length} semaine(s)`);
      setSelectedWeeks([]);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    } finally {
      setCopying(false);
    }
  };

  const yearSelected = remainingWeeksOfYear.every(w => selectedWeeks.some(sw => sw.getTime() === w.getTime()));
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Copy className="w-4 h-4 text-primary" />
          Dupliquer le planning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Week Info */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="font-medium">Semaine actuelle:</span>
            <span className="text-muted-foreground">
              {format(currentWeekStart, 'd MMM', { locale: fr })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: fr })}
            </span>
          </div>
        </div>

        {/* Copy Mode Tabs */}
        <Tabs value={copyMode} onValueChange={(v) => setCopyMode(v as typeof copyMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weeks" className="text-xs gap-1">
              <Calendar className="w-3 h-3" />
              Semaines
            </TabsTrigger>
            <TabsTrigger value="month" className="text-xs gap-1">
              <CalendarDays className="w-3 h-3" />
              Mois
            </TabsTrigger>
            <TabsTrigger value="year" className="text-xs gap-1">
              <CalendarRange className="w-3 h-3" />
              Année
            </TabsTrigger>
          </TabsList>

          {/* Weeks Mode */}
          <TabsContent value="weeks" className="space-y-4 mt-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewOffset(prev => Math.max(0, prev - 4))}
                disabled={viewOffset === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Précédent
              </Button>
              <span className="text-sm text-muted-foreground">
                Semaines à venir
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewOffset(prev => prev + 4)}
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            {/* Weeks Grid */}
            <div className="grid grid-cols-2 gap-2">
              {weeks.map((week) => (
                <button
                  key={week.start.getTime()}
                  onClick={() => toggleWeek(week.start)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    week.isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Sem. {format(week.start, 'w', { locale: fr })}
                    </span>
                    {week.isSelected && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p className="text-sm font-medium mt-1">
                    {format(week.start, 'd MMM', { locale: fr })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    → {format(week.end, 'd MMM', { locale: fr })}
                  </p>
                </button>
              ))}
            </div>
          </TabsContent>

          {/* Month Mode */}
          <TabsContent value="month" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground">
              Sélectionnez un mois pour copier sur toutes ses semaines
            </p>
            <div className="grid grid-cols-2 gap-2">
              {months.map((month) => (
                <button
                  key={month.start.getTime()}
                  onClick={() => selectMonth(month.weeks)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    month.isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {month.label}
                    </span>
                    {month.isSelected && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {month.weeks.length} semaines
                  </p>
                </button>
              ))}
            </div>
          </TabsContent>

          {/* Year Mode */}
          <TabsContent value="year" className="space-y-4 mt-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Copier le planning sur toute l'année {format(today, 'yyyy')}
              </p>
              <button
                onClick={selectYear}
                className={`w-full p-4 rounded-lg border-2 text-center transition-all ${
                  yearSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <CalendarRange className="w-6 h-6 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold">Toute l'année</p>
                    <p className="text-xs text-muted-foreground">
                      {remainingWeeksOfYear.length} semaines restantes
                    </p>
                  </div>
                  {yearSelected && (
                    <Check className="w-5 h-5 text-primary ml-auto" />
                  )}
                </div>
              </button>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Selection & Copy Button */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedWeeks.length > 0 ? (
              <Badge variant="secondary">
                {selectedWeeks.length} semaine(s) sélectionnée(s)
              </Badge>
            ) : (
              'Sélectionnez les périodes cibles'
            )}
          </div>
          <Button
            onClick={handleCopy}
            disabled={selectedWeeks.length === 0 || copying}
            size="sm"
          >
            {copying ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            Dupliquer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}