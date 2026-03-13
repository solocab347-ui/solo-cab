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
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DriverPlatform } from './types';

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
  isModified: boolean;
}

export function DailyActivityInput({ driverId, platforms, onEntryUpdated }: DailyActivityInputProps) {
  const today = new Date();
  const [selectedDate] = useState(today);
  const [entries, setEntries] = useState<PlatformEntry[]>([]);
  const [loadingSoloCab, setLoadingSoloCab] = useState(true);
  const [soloCabSynced, setSoloCabSynced] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingAll, setSavingAll] = useState(false);

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
        isModified: false,
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
        isModified: false,
      })),
    ];
    setEntries(initialEntries);
  }, [platforms]);

  // Fetch SoloCab stats and AUTO-PERSIST to driver_daily_entries
  const fetchAndSyncSoloCabStats = useCallback(async () => {
    if (!driverId) return;
    setLoadingSoloCab(true);
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data: dayStatsRows, error: dayStatsError } = await supabase.rpc('get_driver_solocab_day_stats', {
        p_driver_id: driverId,
        p_day: dateStr,
      });

      if (dayStatsError) {
        throw dayStatsError;
      }

      const dayStats = Array.isArray(dayStatsRows)
        ? dayStatsRows[0]
        : (dayStatsRows as any);

      const stats = {
        revenue: Number(dayStats?.revenue || 0),
        coursesCount: Number(dayStats?.courses_count || 0),
        newClientsCount: Number(dayStats?.new_clients_count || 0),
        kmDriven: Number(dayStats?.km_driven || 0),
        hoursWorked: Number(dayStats?.hours_worked || 0),
      };

      // Update UI
      setEntries(prev => prev.map(e => 
        e.isSolocab 
          ? { ...e, ...stats, isLoading: false, isSaved: true, isModified: false }
          : e
      ));

      // AUTO-PERSIST SoloCab data to driver_daily_entries for progress tracking
      const entryData = {
        driver_id: driverId,
        entry_date: dateStr,
        platform_id: null as string | null,
        is_solocab: true,
        revenue: stats.revenue,
        courses_count: stats.coursesCount,
        new_clients_count: stats.newClientsCount,
        hours_worked: stats.hoursWorked,
        km_driven: stats.kmDriven,
      };

      const { data: existing } = await supabase
        .from('driver_daily_entries')
        .select('id')
        .eq('driver_id', driverId)
        .eq('entry_date', dateStr)
        .eq('is_solocab', true)
        .maybeSingle();

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

      setSoloCabSynced(true);
      onEntryUpdated?.();
    } catch (error) {
      console.error('Error syncing SoloCab stats:', error);
    } finally {
      setLoadingSoloCab(false);
    }
  }, [driverId, selectedDate, onEntryUpdated]);

  // Fetch existing entries for today (external platforms)
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
          
          if (existing && !e.isSolocab) {
            return {
              ...e,
              revenue: existing.revenue || 0,
              coursesCount: existing.courses_count || 0,
              newClientsCount: existing.new_clients_count || 0,
              hoursWorked: existing.hours_worked || 0,
              kmDriven: existing.km_driven || 0,
              isSaved: true,
              isModified: false,
            };
          }
          return e;
        }));

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
    fetchAndSyncSoloCabStats();
    fetchExistingEntries();
  }, [fetchAndSyncSoloCabStats, fetchExistingEntries]);

  const updateEntry = (platformId: string | null, field: keyof PlatformEntry, value: number) => {
    setEntries(prev => prev.map(e => 
      (e.platformId === platformId && !e.isSolocab)
        ? { ...e, [field]: value, isSaved: false, isModified: true }
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
          ? { ...e, isSaved: true, isLoading: false, isModified: false }
          : e
      ));

      onEntryUpdated?.();
      return true;
    } catch (error) {
      console.error('Error saving entry:', error);
      toast.error('Erreur lors de l\'enregistrement');
      setEntries(prev => prev.map(e => 
        (e.platformId === entry.platformId && e.isSolocab === entry.isSolocab)
          ? { ...e, isLoading: false }
          : e
      ));
      return false;
    }
  };

  const saveAllPlatforms = async () => {
    setSavingAll(true);
    const platformsToSave = entries.filter(e => !e.isSolocab && e.isModified);
    
    let successCount = 0;
    for (const entry of platformsToSave) {
      const ok = await saveEntry(entry);
      if (ok) successCount++;
    }

    if (successCount > 0) {
      toast.success(`${successCount} plateforme${successCount > 1 ? 's' : ''} enregistrée${successCount > 1 ? 's' : ''}`);
      onEntryUpdated?.();
    }
    setSavingAll(false);
  };

  const totalRevenue = entries.reduce((sum, e) => sum + e.revenue, 0);
  const totalCourses = entries.reduce((sum, e) => sum + e.coursesCount, 0);
  const soloCabEntry = entries.find(e => e.isSolocab);
  const platformEntries = entries.filter(e => !e.isSolocab);
  const hasUnsavedChanges = platformEntries.some(e => e.isModified);

  return (
    <div className="space-y-4">
      {/* Date Header + Total */}
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
              <p className="text-sm text-muted-foreground">Total consolidé</p>
              <p className="text-2xl font-bold text-foreground">{totalRevenue.toFixed(0)}€</p>
              <p className="text-xs text-muted-foreground">{totalCourses} courses • SoloCab + Apps</p>
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
                  <Badge variant="secondary" className="text-[10px]">
                    {soloCabSynced ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Synchronisé</>
                    ) : (
                      'Auto'
                    )}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Courses terminées & encaissées (CB, espèces, virement)
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAndSyncSoloCabStats}
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

      {/* External Platforms - Always visible */}
      {platformEntries.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Résultats des applications</span>
              </div>
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Non sauvé
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Saisissez vos chiffres Uber, Bolt, etc. pour un suivi consolidé de vos objectifs
            </p>
          </CardHeader>

          <CardContent className="pt-0 space-y-4">
            {platformEntries.map((entry, index) => (
              <div key={entry.platformId}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">{entry.platformName}</span>
                  {entry.isSaved && !entry.isModified && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Check className="w-3 h-3 mr-1" />
                      Enregistré
                    </Badge>
                  )}
                  {entry.isModified && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                      Modifié
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
              </div>
            ))}

            {/* Save All Button */}
            <Button
              onClick={saveAllPlatforms}
              disabled={savingAll || !hasUnsavedChanges}
              className="w-full mt-4"
              size="lg"
            >
              {savingAll ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : hasUnsavedChanges ? (
                <Save className="w-4 h-4 mr-2" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              {savingAll ? 'Enregistrement...' : hasUnsavedChanges ? 'Valider les résultats' : 'Tout est à jour'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="py-4">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              💡 Ajoutez vos plateformes (Uber, Bolt...) dans l'onglet "Plateformes" pour saisir vos revenus externes et les inclure dans vos objectifs.
            </p>
          </CardContent>
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
    </div>
  );
}
