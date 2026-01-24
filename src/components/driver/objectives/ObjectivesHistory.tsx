import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DriverDailyEntry, DriverPlatform } from './types';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar, 
  TrendingUp, 
  Car, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface ObjectivesHistoryProps {
  entries: DriverDailyEntry[];
  platforms: DriverPlatform[];
}

export function ObjectivesHistory({ entries, platforms }: ObjectivesHistoryProps) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { locale: fr }),
        end: endOfWeek(currentDate, { locale: fr }),
      };
    }
    return {
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    };
  }, [currentDate, viewMode]);

  const daysInRange = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  const getEntriesForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.filter(e => e.entry_date === dateStr);
  };

  const getDayTotals = (date: Date) => {
    const dayEntries = getEntriesForDay(date);
    return {
      revenue: dayEntries.reduce((sum, e) => sum + (e.revenue || 0), 0),
      courses: dayEntries.reduce((sum, e) => sum + (e.courses_count || 0), 0),
      newClients: dayEntries.reduce((sum, e) => sum + (e.new_clients_count || 0), 0),
      hours: dayEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0),
    };
  };

  const periodTotals = useMemo(() => {
    const periodEntries = entries.filter(e => {
      const entryDate = new Date(e.entry_date);
      return entryDate >= dateRange.start && entryDate <= dateRange.end;
    });
    return {
      revenue: periodEntries.reduce((sum, e) => sum + (e.revenue || 0), 0),
      courses: periodEntries.reduce((sum, e) => sum + (e.courses_count || 0), 0),
      newClients: periodEntries.reduce((sum, e) => sum + (e.new_clients_count || 0), 0),
      hours: periodEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0),
      km: periodEntries.reduce((sum, e) => sum + (e.km_driven || 0), 0),
    };
  }, [entries, dateRange]);

  const navigate = (direction: 'prev' | 'next') => {
    const delta = viewMode === 'week' ? 7 : 30;
    const days = direction === 'prev' ? -delta : delta;
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  };

  const getPlatformName = (platformId: string | null, isSolocab: boolean) => {
    if (isSolocab) return 'SoloCab';
    const platform = platforms.find(p => p.id === platformId);
    return platform?.platform_name || 'Autre';
  };

  return (
    <div className="space-y-4">
      {/* Period Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-3">
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'week' | 'month')}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="month">Mois</SelectItem>
                </SelectContent>
              </Select>
              
              <span className="font-medium text-sm">
                {format(dateRange.start, 'd MMM', { locale: fr })} - {format(dateRange.end, 'd MMM yyyy', { locale: fr })}
              </span>
            </div>
            
            <Button variant="ghost" size="sm" onClick={() => navigate('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Period Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4 text-primary" />
            Résumé de la période
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center p-2 bg-background rounded-lg">
              <TrendingUp className="w-4 h-4 mx-auto text-green-500 mb-1" />
              <p className="font-bold">{periodTotals.revenue.toFixed(0)}€</p>
              <p className="text-xs text-muted-foreground">CA Total</p>
            </div>
            <div className="text-center p-2 bg-background rounded-lg">
              <Car className="w-4 h-4 mx-auto text-blue-500 mb-1" />
              <p className="font-bold">{periodTotals.courses}</p>
              <p className="text-xs text-muted-foreground">Courses</p>
            </div>
            <div className="text-center p-2 bg-background rounded-lg">
              <Users className="w-4 h-4 mx-auto text-purple-500 mb-1" />
              <p className="font-bold">{periodTotals.newClients}</p>
              <p className="text-xs text-muted-foreground">Nvx clients</p>
            </div>
            <div className="text-center p-2 bg-background rounded-lg">
              <p className="font-bold">{periodTotals.hours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Heures</p>
            </div>
            <div className="text-center p-2 bg-background rounded-lg">
              <p className="font-bold">{periodTotals.km.toFixed(0)} km</p>
              <p className="text-xs text-muted-foreground">Distance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            Détail par jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-2 ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
            {/* Day headers */}
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}
            
            {/* Day cells */}
            {daysInRange.map((day) => {
              const totals = getDayTotals(day);
              const hasData = totals.revenue > 0 || totals.courses > 0;
              const isToday = isSameDay(day, new Date());
              
              return (
                <div 
                  key={day.toISOString()}
                  className={`
                    p-2 rounded-lg border text-center min-h-[80px]
                    ${isToday ? 'border-primary bg-primary/5' : 'border-border'}
                    ${hasData ? 'bg-green-500/5' : 'bg-muted/30'}
                  `}
                >
                  <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(day, 'd')}
                  </p>
                  {hasData ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs font-bold text-green-600">{totals.revenue.toFixed(0)}€</p>
                      <p className="text-[10px] text-muted-foreground">{totals.courses} courses</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-2">-</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Entries */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Détail des entrées</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune donnée enregistrée
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {entries.slice(0, 20).map((entry) => (
                <div 
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {entry.is_solocab ? (
                      <Sparkles className="w-4 h-4 text-primary" />
                    ) : (
                      <Car className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {getPlatformName(entry.platform_id, entry.is_solocab)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(entry.entry_date), 'PPP', { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{entry.revenue?.toFixed(0) || 0}€</p>
                    <p className="text-xs text-muted-foreground">{entry.courses_count || 0} courses</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
