import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  Car, 
  Users, 
  Clock, 
  MapPin,
  Sparkles,
  RefreshCw,
  Save,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DriverPlatform, DriverDailyEntry } from './types';

interface DailyActivityInputProps {
  driverId: string;
  platforms: DriverPlatform[];
  onEntryUpdated?: () => void;
}

interface PlatformEntry {
  platformId: string | null;
  platformName: string;
  isSolocab: boolean;
  revenue: number;
  coursesCount: number;
  newClientsCount: number;
  hoursWorked: number;
  kmDriven: number;
  isSaved: boolean;
  isLoading: boolean;
}

export function DailyActivityInput({ driverId, platforms, onEntryUpdated }: DailyActivityInputProps) {
  const today = new Date();
  const [selectedDate] = useState(today);
  const [entries, setEntries] = useState<PlatformEntry[]>([]);
  const [soloCabStats, setSoloCabStats] = useState<any>(null);
  const [loadingSoloCab, setLoadingSoloCab] = useState(true);
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Initialize entries for SoloCab + external platforms
  useEffect(() => {
    const initialEntries: PlatformEntry[] = [
      {
        platformId: null,
        platformName: 'SoloCab',
        isSolocab: true,
        revenue: 0,
        coursesCount: 0,
        newClientsCount: 0,
        hoursWorked: 0,
        kmDriven: 0,
        isSaved: false,
        isLoading: true,
      },
      ...platforms.map(p => ({
        platformId: p.id,
        platformName: p.platform_name,
        isSolocab: false,
        revenue: 0,
        coursesCount: 0,
        newClientsCount: 0,
        hoursWorked: 0,
        kmDriven: 0,
        isSaved: false,
        isLoading: false,
      })),
    ];
    setEntries(initialEntries);
  }, [platforms]);

  // Fetch SoloCab stats automatically
  const fetchSoloCabStats = useCallback(async () => {
    if (!driverId) return;
    setLoadingSoloCab(true);
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Get courses completed today
      const { data: courses } = await supabase
        .from('courses')
        .select('id, final_payment_amount, guest_estimated_price, distance_km, duration_minutes, client_id')
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .eq('status', 'completed')
        .gte('scheduled_date', `${dateStr}T00:00:00`)
        .lte('scheduled_date', `${dateStr}T23:59:59`);
        
      // Get new clients registered today
      const { data: newClients } = await supabase
        .from('clients')
        .select('id')
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .gte('created_at', `${dateStr}T00:00:00`)
        .lte('created_at', `${dateStr}T23:59:59`);

      const stats = {
        revenue: courses?.reduce((sum, c: any) => sum + (c.final_payment_amount || c.guest_estimated_price || 0), 0) || 0,
        coursesCount: courses?.length || 0,
        newClientsCount: newClients?.length || 0,
        kmDriven: courses?.reduce((sum, c: any) => sum + (c.distance_km || 0), 0) || 0,
        hoursWorked: courses?.reduce((sum, c: any) => sum + ((c.duration_minutes || 0) / 60), 0) || 0,
      };

      setSoloCabStats(stats);
      
      // Update SoloCab entry
      setEntries(prev => prev.map(e => 
        e.isSolocab 
          ? { 
              ...e, 
              revenue: stats.revenue,
              coursesCount: stats.coursesCount,
              newClientsCount: stats.newClientsCount,
              kmDriven: stats.kmDriven,
              hoursWorked: stats.hoursWorked,
              isLoading: false,
            }
          : e
      ));
    } catch (error) {
      console.error('Error fetching SoloCab stats:', error);
    } finally {
      setLoadingSoloCab(false);
    }
  }, [driverId, selectedDate]);

  // Fetch existing entries for today
  const fetchExistingEntries = useCallback(async () => {
    if (!driverId) return;
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data: existingEntries } = await supabase
        .from('driver_daily_entries')
        .select('*')
        .eq('driver_id', driverId)
        .eq('entry_date', dateStr);

      if (existingEntries && existingEntries.length > 0) {
        setEntries(prev => prev.map(e => {
          const existing = existingEntries.find(ex => 
            (e.isSolocab && ex.is_solocab) || 
            (!e.isSolocab && ex.platform_id === e.platformId)
          );
          
          if (existing) {
            return {
              ...e,
              revenue: e.isSolocab ? e.revenue : existing.revenue || 0,
              coursesCount: e.isSolocab ? e.coursesCount : existing.courses_count || 0,
              newClientsCount: e.isSolocab ? e.newClientsCount : existing.new_clients_count || 0,
              hoursWorked: e.isSolocab ? e.hoursWorked : existing.hours_worked || 0,
              kmDriven: e.isSolocab ? e.kmDriven : existing.km_driven || 0,
              isSaved: true,
            };
          }
          return e;
        }));

        // Get notes from any entry
        const entryWithNotes = existingEntries.find(e => e.notes);
        if (entryWithNotes?.notes) {
          setNotes(entryWithNotes.notes);
        }
      }
    } catch (error) {
      console.error('Error fetching existing entries:', error);
    }
  }, [driverId, selectedDate]);

  useEffect(() => {
    fetchSoloCabStats();
    fetchExistingEntries();
  }, [fetchSoloCabStats, fetchExistingEntries]);

  const updateEntry = (platformId: string | null, field: keyof PlatformEntry, value: number) => {
    setEntries(prev => prev.map(e => 
      (e.platformId === platformId || (platformId === null && e.isSolocab))
        ? { ...e, [field]: value, isSaved: false }
        : e
    ));
  };

  const saveEntry = async (entry: PlatformEntry) => {
    if (!driverId) return;
    
    setEntries(prev => prev.map(e => 
      (e.platformId === entry.platformId && e.isSolocab === entry.isSolocab)
        ? { ...e, isLoading: true }
        : e
    ));

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Check for existing entry
      const { data: existing } = await supabase
        .from('driver_daily_entries')
        .select('id')
        .eq('driver_id', driverId)
        .eq('entry_date', dateStr)
        .eq('is_solocab', entry.isSolocab)
        .eq('platform_id', entry.platformId)
        .maybeSingle();

      const entryData = {
        driver_id: driverId,
        entry_date: dateStr,
        platform_id: entry.platformId,
        is_solocab: entry.isSolocab,
        revenue: entry.revenue,
        courses_count: entry.coursesCount,
        new_clients_count: entry.newClientsCount,
        hours_worked: entry.hoursWorked,
        km_driven: entry.kmDriven,
        notes: notes || null,
      };

      if (existing) {
        await supabase
          .from('driver_daily_entries')
          .update({ ...entryData, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('driver_daily_entries')
          .insert(entryData);
      }

      setEntries(prev => prev.map(e => 
        (e.platformId === entry.platformId && e.isSolocab === entry.isSolocab)
          ? { ...e, isSaved: true, isLoading: false }
          : e
      ));

      toast.success(`${entry.platformName} enregistré`);
      onEntryUpdated?.();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Erreur lors de l\'enregistrement');
      setEntries(prev => prev.map(e => 
        (e.platformId === entry.platformId && e.isSolocab === entry.isSolocab)
          ? { ...e, isLoading: false }
          : e
      ));
    }
  };

  const totalRevenue = entries.reduce((sum, e) => sum + e.revenue, 0);
  const totalCourses = entries.reduce((sum, e) => sum + e.coursesCount, 0);
  const soloCabEntry = entries.find(e => e.isSolocab);
  const platformEntries = entries.filter(e => !e.isSolocab);

  return (
    <div className="space-y-4">
      {/* Date Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aujourd'hui</p>
              <p className="text-lg font-bold capitalize">
                {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total du jour</p>
              <p className="text-2xl font-bold text-foreground">{totalRevenue.toFixed(0)}€</p>
              <p className="text-xs text-muted-foreground">{totalCourses} courses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SoloCab Entry - Auto-synced */}
      <Card className="overflow-hidden border-primary/30">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  SoloCab
                  <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">Synchronisation automatique</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchSoloCabStats}
              disabled={loadingSoloCab}
            >
              {loadingSoloCab ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {soloCabEntry && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <TrendingUp className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                <p className="text-lg font-bold">{soloCabEntry.revenue.toFixed(0)}€</p>
                <p className="text-[10px] text-muted-foreground">CA</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <Car className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                <p className="text-lg font-bold">{soloCabEntry.coursesCount}</p>
                <p className="text-[10px] text-muted-foreground">Courses</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-center">
                <Users className="w-4 h-4 mx-auto text-purple-500 mb-1" />
                <p className="text-lg font-bold">{soloCabEntry.newClientsCount}</p>
                <p className="text-[10px] text-muted-foreground">Nvx clients</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* External Platforms */}
      {platformEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-0 h-auto"
              onClick={() => setShowPlatforms(!showPlatforms)}
            >
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Autres plateformes</span>
                <Badge variant="outline">{platformEntries.length}</Badge>
              </div>
              {showPlatforms ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>
          </CardHeader>

          <AnimatePresence>
            {showPlatforms && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <CardContent className="pt-0 space-y-4">
                  {platformEntries.map((entry) => (
                    <div key={entry.platformId} className="space-y-3">
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{entry.platformName}</span>
                        {entry.isSaved && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Check className="w-3 h-3 mr-1" />
                            Enregistré
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                            CA (€)
                          </Label>
                          <Input
                            type="number"
                            value={entry.revenue || ''}
                            onChange={(e) => updateEntry(entry.platformId, 'revenue', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Car className="w-3 h-3 text-blue-500" />
                            Courses
                          </Label>
                          <Input
                            type="number"
                            value={entry.coursesCount || ''}
                            onChange={(e) => updateEntry(entry.platformId, 'coursesCount', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Clock className="w-3 h-3 text-orange-500" />
                            Heures
                          </Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={entry.hoursWorked || ''}
                            onChange={(e) => updateEntry(entry.platformId, 'hoursWorked', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-red-500" />
                            Km
                          </Label>
                          <Input
                            type="number"
                            value={entry.kmDriven || ''}
                            onChange={(e) => updateEntry(entry.platformId, 'kmDriven', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => saveEntry(entry)}
                        disabled={entry.isLoading || entry.isSaved}
                        className="w-full"
                      >
                        {entry.isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : entry.isSaved ? (
                          <Check className="w-4 h-4 mr-2" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {entry.isSaved ? 'Enregistré' : 'Enregistrer'}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Quick Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Notes du jour (optionnel)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Remarques, événements particuliers..."
            rows={2}
            className="text-sm"
          />
        </CardContent>
      </Card>

      {/* No platforms message */}
      {platformEntries.length === 0 && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="py-4">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              💡 Ajoutez vos plateformes (Uber, Bolt...) dans l'onglet "Plateformes" pour saisir vos revenus externes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
