import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, isToday, isBefore, startOfDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Car,
  Clock,
  MapPin,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Settings,
  Plus,
  X,
  Zap,
  Music,
  Briefcase,
  Navigation,
  Crown,
  Star,
  Users,
  CalendarDays,
  Hand,
  QrCode,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickPlatformEntryProps {
  driverId: string;
  onEntrySaved?: () => void;
}

interface PlatformData {
  id: string;
  platform_name: string;
  platform_icon: string;
}

interface EntryState {
  platformId: string;
  platformName: string;
  revenue: number;
  coursesCount: number;
  hoursWorked: number;
  kmDriven: number;
  cardsProposedCount: number;
  qrScansCount: number;
  directSignupsCount: number;
  isSaved: boolean;
  isModified: boolean;
}

interface SoloCabStats {
  revenue: number;
  coursesCount: number;
  newClientsCount: number;
}

// Mapping from onboarding platform IDs to names/icons
const ONBOARDING_PLATFORM_MAP: Record<string, { name: string; icon: string }> = {
  uber: { name: 'Uber', icon: 'car' },
  bolt: { name: 'Bolt', icon: 'zap' },
  heetch: { name: 'Heetch', icon: 'music' },
  marcel: { name: 'Marcel', icon: 'briefcase' },
  freenow: { name: 'FreeNow', icon: 'navigation' },
  lecab: { name: 'LeCab', icon: 'crown' },
  kapten: { name: 'Kapten', icon: 'star' },
  clients_directs: { name: 'Clients directs', icon: 'users' },
};

const ICON_MAP: Record<string, any> = {
  car: Car,
  zap: Zap,
  music: Music,
  briefcase: Briefcase,
  navigation: Navigation,
  crown: Crown,
  star: Star,
  users: Users,
};

const AVAILABLE_PLATFORMS = [
  { name: 'Uber', icon: 'car' },
  { name: 'Bolt', icon: 'zap' },
  { name: 'Heetch', icon: 'music' },
  { name: 'Marcel', icon: 'briefcase' },
  { name: 'FreeNow', icon: 'navigation' },
  { name: 'LeCab', icon: 'crown' },
  { name: 'Kapten', icon: 'star' },
  { name: 'Clients directs', icon: 'users' },
];

export function QuickPlatformEntry({ driverId, onEntrySaved }: QuickPlatformEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [platforms, setPlatforms] = useState<PlatformData[]>([]);
  const [entries, setEntries] = useState<EntryState[]>([]);
  const [soloCabStats, setSoloCabStats] = useState<SoloCabStats>({ revenue: 0, coursesCount: 0, newClientsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [addingPlatform, setAddingPlatform] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isSelectedToday = isToday(selectedDate);
  // Allow editing up to 30 days back
  const minDate = subDays(new Date(), 30);
  const canGoPrev = isBefore(minDate, startOfDay(selectedDate));
  const canGoNext = !isSelectedToday;

  const navigateDate = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'prev' ? subDays(prev, 1) : addDays(prev, 1));
  };

  const getDateLabel = () => {
    if (isToday(selectedDate)) return "Aujourd'hui";
    if (isToday(addDays(selectedDate, 1))) return "Hier";
    return format(selectedDate, 'EEEE d MMMM', { locale: fr });
  };

  // Auto-seed platforms from onboarding objectives_data if driver_platforms is empty
  const seedPlatformsFromOnboarding = useCallback(async (existingPlatforms: PlatformData[]) => {
    if (!driverId || existingPlatforms.length > 0) return existingPlatforms;

    try {
      const { data: driver } = await supabase
        .from('drivers')
        .select('objectives_data')
        .eq('id', driverId)
        .single();

      const objectivesData = driver?.objectives_data as Record<string, any> | null;
      const platformsUsed = objectivesData?.platformsUsed as string[] | undefined;

      if (!platformsUsed || platformsUsed.length === 0) return existingPlatforms;

      // Insert platforms from onboarding into driver_platforms
      const toInsert = platformsUsed.map((pid, index) => {
        const mapped = ONBOARDING_PLATFORM_MAP[pid];
        return {
          driver_id: driverId,
          platform_name: mapped?.name || pid,
          platform_icon: mapped?.icon || 'car',
          display_order: index,
          is_active: true,
        };
      });

      const { data: inserted, error } = await supabase
        .from('driver_platforms')
        .insert(toInsert)
        .select('id, platform_name, platform_icon');

      if (error) {
        console.error('Error seeding platforms:', error);
        return existingPlatforms;
      }

      console.log('✅ Plateformes auto-importées depuis l\'inscription:', inserted?.length);
      return inserted || existingPlatforms;
    } catch (error) {
      console.error('Error seeding platforms from onboarding:', error);
      return existingPlatforms;
    }
  }, [driverId]);

  // Load platforms + existing entries + SoloCab stats
  const loadData = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);

    try {
      const [platformsRes, entriesRes, dayStatsRes] = await Promise.all([
        supabase
          .from('driver_platforms')
          .select('id, platform_name, platform_icon')
          .eq('driver_id', driverId)
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('driver_daily_entries')
          .select('*')
          .eq('driver_id', driverId)
          .eq('entry_date', dateStr),
        supabase.rpc('get_driver_solocab_day_stats', {
          p_driver_id: driverId,
          p_day: dateStr,
        }),
      ]);

      let platformsList = platformsRes.data || [];
      
      // Auto-seed from onboarding if empty
      platformsList = await seedPlatformsFromOnboarding(platformsList);
      setPlatforms(platformsList);

      // SoloCab auto stats (source unique backend, cohérent avec le dashboard)
      if (dayStatsRes.error) {
        throw dayStatsRes.error;
      }

      const dayStats = Array.isArray(dayStatsRes.data)
        ? dayStatsRes.data[0]
        : (dayStatsRes.data as any);

      setSoloCabStats({
        revenue: Number(dayStats?.revenue || 0),
        coursesCount: Number(dayStats?.courses_count || 0),
        newClientsCount: Number(dayStats?.new_clients_count || 0),
      });

      // Build entries for each platform
      const existingEntries = entriesRes.data || [];
      const entryStates: EntryState[] = platformsList.map(p => {
        const existing = existingEntries.find(e => e.platform_id === p.id && !e.is_solocab) as any;
        return {
          platformId: p.id,
          platformName: p.platform_name,
          revenue: existing?.revenue || 0,
          coursesCount: existing?.courses_count || 0,
          hoursWorked: existing?.hours_worked || 0,
          kmDriven: existing?.km_driven || 0,
          cardsProposedCount: existing?.cards_proposed_count || 0,
          qrScansCount: existing?.qr_scans_count || 0,
          directSignupsCount: existing?.direct_signups_count || 0,
          isSaved: !!existing,
          isModified: false,
        };
      });
      setEntries(entryStates);
    } catch (error) {
      console.error('Error loading platform data:', error);
    } finally {
      setLoading(false);
    }
  }, [driverId, dateStr, seedPlatformsFromOnboarding]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync SoloCab entry to driver_daily_entries
  const syncSoloCab = useCallback(async () => {
    if (!driverId) return;
    setSyncing(true);
    try {
      const entryData = {
        driver_id: driverId,
        entry_date: dateStr,
        platform_id: null as string | null,
        is_solocab: true,
        revenue: soloCabStats.revenue,
        courses_count: soloCabStats.coursesCount,
        new_clients_count: soloCabStats.newClientsCount,
        hours_worked: 0,
        km_driven: 0,
      };

      const { data: existing } = await supabase
        .from('driver_daily_entries')
        .select('id')
        .eq('driver_id', driverId)
        .eq('entry_date', dateStr)
        .eq('is_solocab', true)
        .maybeSingle();

      if (existing) {
        await supabase.from('driver_daily_entries').update({ ...entryData, updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('driver_daily_entries').insert(entryData);
      }
    } catch (error) {
      console.error('Error syncing SoloCab:', error);
    } finally {
      setSyncing(false);
    }
  }, [driverId, dateStr, soloCabStats]);

  useEffect(() => {
    if (!loading && soloCabStats.coursesCount >= 0) {
      syncSoloCab();
    }
  }, [loading, syncSoloCab]);

  const updateEntry = (platformId: string, field: keyof EntryState, value: number) => {
    setEntries(prev => prev.map(e =>
      e.platformId === platformId
        ? { ...e, [field]: value, isModified: true, isSaved: false }
        : e
    ));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const modified = entries.filter(e => e.isModified);
      for (const entry of modified) {
        const entryData = {
          driver_id: driverId,
          entry_date: dateStr,
          platform_id: entry.platformId,
          is_solocab: false,
          revenue: entry.revenue,
          courses_count: entry.coursesCount,
          hours_worked: entry.hoursWorked,
          km_driven: entry.kmDriven,
          new_clients_count: 0,
          cards_proposed_count: entry.cardsProposedCount,
          qr_scans_count: entry.qrScansCount,
          direct_signups_count: entry.directSignupsCount,
        };

        const { data: existing } = await supabase
          .from('driver_daily_entries')
          .select('id')
          .eq('driver_id', driverId)
          .eq('entry_date', dateStr)
          .eq('platform_id', entry.platformId)
          .maybeSingle();

        if (existing) {
          await supabase.from('driver_daily_entries').update({ ...entryData, updated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('driver_daily_entries').insert(entryData);
        }
      }

      setEntries(prev => prev.map(e => ({ ...e, isSaved: true, isModified: false })));
      toast.success('Résultats enregistrés !');
      onEntrySaved?.();
    } catch (error) {
      console.error('Error saving entries:', error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  // Add a platform
  const addPlatform = async (name: string, icon: string) => {
    if (platforms.some(p => p.platform_name.toLowerCase() === name.toLowerCase())) {
      toast.error('Cette plateforme existe déjà');
      return;
    }
    setAddingPlatform(true);
    try {
      const { data, error } = await supabase
        .from('driver_platforms')
        .insert({
          driver_id: driverId,
          platform_name: name,
          platform_icon: icon,
          display_order: platforms.length,
          is_active: true,
        })
        .select('id, platform_name, platform_icon')
        .single();

      if (error) throw error;
      if (data) {
        setPlatforms(prev => [...prev, data]);
        setEntries(prev => [...prev, {
          platformId: data.id,
          platformName: data.platform_name,
          revenue: 0,
          coursesCount: 0,
          hoursWorked: 0,
          kmDriven: 0,
          cardsProposedCount: 0,
          qrScansCount: 0,
          directSignupsCount: 0,
          isSaved: false,
          isModified: false,
        }]);
        toast.success(`${name} ajouté`);
      }
    } catch (error) {
      console.error('Error adding platform:', error);
      toast.error("Erreur lors de l'ajout");
    } finally {
      setAddingPlatform(false);
    }
  };

  // Remove a platform
  const removePlatform = async (platformId: string) => {
    try {
      await supabase.from('driver_platforms').update({ is_active: false }).eq('id', platformId);
      setPlatforms(prev => prev.filter(p => p.id !== platformId));
      setEntries(prev => prev.filter(e => e.platformId !== platformId));
      toast.success('Plateforme retirée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const hasUnsaved = entries.some(e => e.isModified);
  const totalExternalRevenue = entries.reduce((sum, e) => sum + e.revenue, 0);
  const totalExternalCourses = entries.reduce((sum, e) => sum + e.coursesCount, 0);
  const grandTotalRevenue = soloCabStats.revenue + totalExternalRevenue;
  const grandTotalCourses = soloCabStats.coursesCount + totalExternalCourses;

  const availableToAdd = AVAILABLE_PLATFORMS.filter(
    ap => !platforms.some(p => p.platform_name.toLowerCase() === ap.name.toLowerCase())
  );

  return (
    <Card className="relative overflow-hidden border-border/50">
      {/* Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <PlusCircle className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                Saisie rapide
                {hasUnsaved && (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                    <AlertCircle className="w-3 h-3 mr-0.5" /> Non sauvé
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground truncate">
                {getDateLabel()} • {grandTotalRevenue.toFixed(0)}€ • {grandTotalCourses} courses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalExternalRevenue > 0 && !expanded && (
              <Badge variant="secondary" className="text-[10px]">
                Apps : {totalExternalRevenue.toFixed(0)}€
              </Badge>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Réduire la saisie rapide' : 'Ouvrir la saisie rapide'}
            >
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Date Navigation */}
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateDate('prev')}
              disabled={!canGoPrev}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium capitalize">{getDateLabel()}</span>
              {!isSelectedToday && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setSelectedDate(new Date())}
                >
                  Aujourd'hui
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateDate('next')}
              disabled={!canGoNext}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* SoloCab auto row */}
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">SoloCab</span>
              <Badge variant="secondary" className="text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-0.5 text-emerald-500" /> Auto
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-bold">{soloCabStats.revenue.toFixed(0)}€</span>
              <span className="text-muted-foreground">{soloCabStats.coursesCount} courses</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={loadData}
                disabled={syncing}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
              </Button>
            </div>
          </div>

          <Separator />

          {/* External platforms */}
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {entries.length === 0 && !showManage && (
                <div className="text-center py-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    Aucune plateforme externe configurée
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowManage(true)}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" /> Ajouter des plateformes
                  </Button>
                </div>
              )}

              {entries.map((entry, index) => {
                const platform = platforms.find(p => p.id === entry.platformId);
                const IconComp = ICON_MAP[platform?.platform_icon || 'car'] || Car;
                return (
                  <div key={entry.platformId}>
                    {index > 0 && <Separator className="mb-3" />}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <IconComp className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{entry.platformName}</span>
                      </div>
                      {entry.isSaved && !entry.isModified && (
                        <Badge variant="secondary" className="text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" /> Sauvé
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-500" /> CA (€)
                        </Label>
                        <Input
                          type="number"
                          value={entry.revenue || ''}
                          onChange={(e) => updateEntry(entry.platformId, 'revenue', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] flex items-center gap-1">
                          <Car className="w-3 h-3 text-blue-500" /> Courses
                        </Label>
                        <Input
                          type="number"
                          value={entry.coursesCount || ''}
                          onChange={(e) => updateEntry(entry.platformId, 'coursesCount', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-orange-500" /> Heures
                        </Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={entry.hoursWorked || ''}
                          onChange={(e) => updateEntry(entry.platformId, 'hoursWorked', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-500" /> Km
                        </Label>
                        <Input
                          type="number"
                          value={entry.kmDriven || ''}
                          onChange={(e) => updateEntry(entry.platformId, 'kmDriven', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Bloc Acquisition — le vrai levier d'indépendance */}
                    <div className="mt-3 p-2.5 rounded-lg bg-primary/5 border border-primary/15">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Crown className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                          Acquisition (ton vrai levier)
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] flex items-center gap-1">
                            <Hand className="w-3 h-3 text-amber-500" /> Cartes
                          </Label>
                          <Input
                            type="number"
                            value={entry.cardsProposedCount || ''}
                            onChange={(e) => updateEntry(entry.platformId, 'cardsProposedCount', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="h-8 text-sm"
                            title="Nombre de fois où tu as proposé ta carte SoloCab"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] flex items-center gap-1">
                            <QrCode className="w-3 h-3 text-purple-500" /> Scans
                          </Label>
                          <Input
                            type="number"
                            value={entry.qrScansCount || ''}
                            onChange={(e) => updateEntry(entry.platformId, 'qrScansCount', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="h-8 text-sm"
                            title="Nombre de scans QR confirmés"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] flex items-center gap-1">
                            <UserPlus className="w-3 h-3 text-emerald-500" /> Inscrits
                          </Label>
                          <Input
                            type="number"
                            value={entry.directSignupsCount || ''}
                            onChange={(e) => updateEntry(entry.platformId, 'directSignupsCount', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="h-8 text-sm"
                            title="Nouveaux clients directs créés depuis cette plateforme"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Save button */}
              {entries.length > 0 && (
                <Button
                  type="button"
                  onClick={saveAll}
                  disabled={saving || !hasUnsaved}
                  className="w-full"
                  size="sm"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : hasUnsaved ? (
                    <Save className="w-4 h-4 mr-2" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  {saving ? 'Enregistrement...' : hasUnsaved ? 'Valider les résultats' : 'Tout est à jour'}
                </Button>
              )}

              <Separator />

              {/* Manage platforms toggle */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowManage(!showManage)}
                className="w-full gap-2 text-muted-foreground"
              >
                <Settings className="w-4 h-4" />
                {showManage ? 'Fermer la gestion' : 'Gérer mes plateformes'}
              </Button>

              {/* Platform management panel */}
              {showManage && (
                <div className="space-y-3">
                  {/* Current platforms with remove */}
                  {platforms.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Mes plateformes actives</p>
                      <div className="flex flex-wrap gap-1.5">
                        {platforms.map(p => {
                          const IconComp = ICON_MAP[p.platform_icon] || Car;
                          return (
                            <Badge
                              key={p.id}
                              variant="secondary"
                              className="gap-1 cursor-pointer hover:bg-destructive/20 hover:text-destructive pr-1"
                              onClick={() => removePlatform(p.id)}
                            >
                              <IconComp className="w-3 h-3" />
                              {p.platform_name}
                              <X className="w-3 h-3 ml-0.5" />
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Available platforms to add */}
                  {availableToAdd.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Ajouter une plateforme</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableToAdd.map(ap => {
                          const IconComp = ICON_MAP[ap.icon] || Car;
                          return (
                            <Button
                              type="button"
                              key={ap.name}
                              variant="outline"
                              size="sm"
                              className="gap-1 h-7 text-xs"
                              disabled={addingPlatform}
                              onClick={() => addPlatform(ap.name, ap.icon)}
                            >
                              <IconComp className="w-3 h-3" />
                              {ap.name}
                              <Plus className="w-3 h-3" />
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
