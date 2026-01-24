import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Copy, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2
} from 'lucide-react';
import { format, addWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface WeekCopierProps {
  onCopyWeek: (targetWeekStart: Date) => Promise<void>;
}

export function WeekCopier({ onCopyWeek }: WeekCopierProps) {
  const [selectedWeeks, setSelectedWeeks] = useState<Date[]>([]);
  const [copying, setCopying] = useState(false);
  const [viewOffset, setViewOffset] = useState(0);
  
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
  
  const toggleWeek = (weekStart: Date) => {
    setSelectedWeeks(prev => {
      const exists = prev.some(w => w.getTime() === weekStart.getTime());
      if (exists) {
        return prev.filter(w => w.getTime() !== weekStart.getTime());
      }
      return [...prev, weekStart];
    });
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
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Copy className="w-4 h-4 text-primary" />
          Copier la semaine actuelle
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
        
        {/* Selection & Copy Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            {selectedWeeks.length > 0 ? (
              <Badge variant="secondary">
                {selectedWeeks.length} semaine(s) sélectionnée(s)
              </Badge>
            ) : (
              'Sélectionnez les semaines cibles'
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
            Copier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
