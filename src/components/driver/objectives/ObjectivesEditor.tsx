import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  TrendingUp, 
  Users, 
  Smartphone, 
  Clock, 
  Calendar, 
  Edit3, 
  Save, 
  X,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Car,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ObjectivesData {
  current_monthly_revenue?: number;
  current_direct_clients?: number;
  platform_percentage?: number;
  solocab_percentage?: number;
  target_monthly_revenue?: number;
  target_weekly_revenue?: number;
  target_direct_clients?: number;
  target_monthly_courses?: number;
  target_monthly_km?: number;
  work_hours_per_day?: number;
  work_days_per_week?: number;
  selected_work_days?: string[];
  daily_targets?: Record<string, { target: number; weight: number }>;
  estimated_hourly_target?: number;
  goals_completed_at?: string;
}

interface ObjectivesEditorProps {
  driverId: string;
  onUpdate?: () => void;
}

const DAYS_OF_WEEK = [
  { id: 'lundi', label: 'Lun', fullLabel: 'Lundi', weight: 0.7, index: 1 },
  { id: 'mardi', label: 'Mar', fullLabel: 'Mardi', weight: 0.85, index: 2 },
  { id: 'mercredi', label: 'Mer', fullLabel: 'Mercredi', weight: 0.95, index: 3 },
  { id: 'jeudi', label: 'Jeu', fullLabel: 'Jeudi', weight: 0.95, index: 4 },
  { id: 'vendredi', label: 'Ven', fullLabel: 'Vendredi', weight: 1.15, index: 5 },
  { id: 'samedi', label: 'Sam', fullLabel: 'Samedi', weight: 1.2, index: 6 },
  { id: 'dimanche', label: 'Dim', fullLabel: 'Dimanche', weight: 1.2, index: 0 },
];

type EditSection = 'revenue' | 'clients' | 'independence' | 'planning' | 'courses' | 'km' | null;

export function ObjectivesEditor({ driverId, onUpdate }: ObjectivesEditorProps) {
  const [objectivesData, setObjectivesData] = useState<ObjectivesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  
  // Editable fields
  const [targetRevenue, setTargetRevenue] = useState(5000);
  const [targetClients, setTargetClients] = useState(15);
  const [platformPercentage, setPlatformPercentage] = useState(80);
  const [targetCourses, setTargetCourses] = useState(100);
  const [targetKm, setTargetKm] = useState(2000);
  const [selectedDays, setSelectedDays] = useState<string[]>(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']);
  const [workHoursPerDay, setWorkHoursPerDay] = useState(8);

  useEffect(() => {
    fetchObjectivesData();
  }, [driverId]);

  const fetchObjectivesData = async () => {
    try {
      const { data: driver } = await supabase
        .from('drivers')
        .select('objectives_data')
        .eq('id', driverId)
        .single();

      if (driver?.objectives_data) {
        const data = driver.objectives_data as ObjectivesData;
        setObjectivesData(data);
        
        // Initialize editable fields
        if (data.target_monthly_revenue) setTargetRevenue(data.target_monthly_revenue);
        if (data.target_direct_clients) setTargetClients(data.target_direct_clients);
        if (data.platform_percentage !== undefined) setPlatformPercentage(data.platform_percentage);
        if (data.target_monthly_courses) setTargetCourses(data.target_monthly_courses);
        if (data.target_monthly_km) setTargetKm(data.target_monthly_km);
        if (data.selected_work_days) setSelectedDays(data.selected_work_days);
        if (data.work_hours_per_day) setWorkHoursPerDay(data.work_hours_per_day);
      }
    } catch (error) {
      console.error('Error fetching objectives data:', error);
    } finally {
      setLoading(false);
    }
  };

  const solocabPercentage = 100 - platformPercentage;
  const weeklyRevenue = Math.round(targetRevenue / 4);

  // Calculate daily targets with AI weighting
  const dailyTargets = useMemo(() => {
    const selectedDayData = DAYS_OF_WEEK.filter(d => selectedDays.includes(d.id));
    if (selectedDayData.length === 0) return [];
    
    const totalWeight = selectedDayData.reduce((sum, d) => sum + d.weight, 0);
    
    return selectedDayData.map(day => {
      const dayShare = day.weight / totalWeight;
      const dailyTarget = Math.round(weeklyRevenue * dayShare);
      return { ...day, dailyTarget };
    });
  }, [selectedDays, weeklyRevenue]);

  const toggleDay = (dayId: string) => {
    setSelectedDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const saveSection = async (section: EditSection) => {
    if (!section) return;
    setSaving(true);
    
    try {
      const totalHoursMonthly = workHoursPerDay * selectedDays.length * 4;
      const estimatedHourlyTarget = Math.round(targetRevenue / totalHoursMonthly);

      const dailyTargetsMap: Record<string, { target: number; weight: number }> = {};
      dailyTargets.forEach(day => {
        dailyTargetsMap[day.id] = { target: day.dailyTarget, weight: day.weight };
      });

      const updatedData: ObjectivesData = {
        ...objectivesData,
        target_monthly_revenue: targetRevenue,
        target_weekly_revenue: weeklyRevenue,
        target_direct_clients: targetClients,
        target_monthly_courses: targetCourses,
        target_monthly_km: targetKm,
        platform_percentage: platformPercentage,
        solocab_percentage: solocabPercentage,
        work_hours_per_day: workHoursPerDay,
        work_days_per_week: selectedDays.length,
        selected_work_days: selectedDays,
        daily_targets: dailyTargetsMap,
        estimated_hourly_target: estimatedHourlyTarget,
      };

      await supabase
        .from('drivers')
        .update({ objectives_data: JSON.parse(JSON.stringify(updatedData)) })
        .eq('id', driverId);

      // Also update driver_objectives table
      const multipliers = {
        daily: { revenue: 1/22, clients: 1/22, hours: 1, courses: 1/22, km: 1/22 },
        weekly: { revenue: 1/4, clients: 1/4, hours: selectedDays.length, courses: 1/4, km: 1/4 },
        monthly: { revenue: 1, clients: 1, hours: selectedDays.length * 4, courses: 1, km: 1 },
        yearly: { revenue: 12, clients: 12, hours: selectedDays.length * 4 * 12, courses: 12, km: 12 }
      };

      for (const period of ['daily', 'weekly', 'monthly', 'yearly'] as const) {
        const mult = multipliers[period];
        await supabase
          .from('driver_objectives')
          .upsert({
            driver_id: driverId,
            period_type: period,
            revenue_target: Math.round(targetRevenue * mult.revenue),
            new_clients_target: Math.round(targetClients * mult.clients),
            hours_target: Math.round(workHoursPerDay * mult.hours),
            courses_target: Math.round(targetCourses * mult.courses),
            km_target: Math.round(targetKm * mult.km),
            is_active: true,
          }, { onConflict: 'driver_id,period_type' });
      }

      // Update work schedules
      for (const day of DAYS_OF_WEEK) {
        const isWorking = selectedDays.includes(day.id);
        await supabase
          .from('driver_work_schedules')
          .upsert({
            driver_id: driverId,
            day_of_week: day.index,
            is_working_day: isWorking,
            target_hours: isWorking ? workHoursPerDay : 0,
          }, { onConflict: 'driver_id,day_of_week' });
      }

      setObjectivesData(updatedData);
      setEditingSection(null);
      toast.success('Objectif mis à jour !');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving section:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-48 bg-muted/30 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const hasData = objectivesData?.goals_completed_at;

  return (
    <div className="space-y-4">
      {/* Revenue Objective Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Objectif CA mensuel</CardTitle>
                <p className="text-2xl font-bold text-foreground">{targetRevenue.toLocaleString()}€</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setEditingSection(editingSection === 'revenue' ? null : 'revenue')}
            >
              {editingSection === 'revenue' ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {editingSection === 'revenue' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="pt-0 pb-4">
                <Separator className="my-3" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Objectif mensuel (€)</Label>
                    <Input
                      type="number"
                      value={targetRevenue}
                      onChange={(e) => setTargetRevenue(parseInt(e.target.value) || 0)}
                      min={1000}
                      max={50000}
                      step={500}
                    />
                    <p className="text-xs text-muted-foreground">
                      ≈ {Math.round(targetRevenue / 4).toLocaleString()}€/semaine • {(targetRevenue * 12).toLocaleString()}€/an
                    </p>
                  </div>
                  <Button onClick={() => saveSection('revenue')} disabled={saving} className="w-full">
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Clients Objective Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Objectif clients</CardTitle>
                <p className="text-2xl font-bold text-foreground">{targetClients} clients</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setEditingSection(editingSection === 'clients' ? null : 'clients')}
            >
              {editingSection === 'clients' ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {editingSection === 'clients' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="pt-0 pb-4">
                <Separator className="my-3" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre de clients directs visé</Label>
                    <Input
                      type="number"
                      value={targetClients}
                      onChange={(e) => setTargetClients(parseInt(e.target.value) || 0)}
                      min={5}
                      max={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      {targetClients >= 50 ? '🎯 Objectif d\'indépendance atteint !' : `${50 - targetClients} clients restants pour l'indépendance`}
                    </p>
                  </div>
                  <Button onClick={() => saveSection('clients')} disabled={saving} className="w-full">
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Independence Objective Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Indépendance</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">{platformPercentage}% Apps</Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <Badge className="bg-primary text-xs">{solocabPercentage}% Privé</Badge>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setEditingSection(editingSection === 'independence' ? null : 'independence')}
            >
              {editingSection === 'independence' ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {editingSection === 'independence' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="pt-0 pb-4">
                <Separator className="my-3" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Répartition plateformes / privé</Label>
                    <Slider
                      value={[platformPercentage]}
                      onValueChange={([v]) => setPlatformPercentage(v)}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                      <motion.div 
                        className="bg-destructive"
                        animate={{ width: `${platformPercentage}%` }}
                      />
                      <motion.div 
                        className="bg-primary"
                        animate={{ width: `${solocabPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="text-destructive">Uber/Bolt: {platformPercentage}%</span>
                      <span className="text-primary">Privé SoloCab: {solocabPercentage}%</span>
                    </div>
                  </div>
                  <Button onClick={() => saveSection('independence')} disabled={saving} className="w-full">
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Planning Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Planning de travail</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedDays.length} jours • {workHoursPerDay}h/jour
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setEditingSection(editingSection === 'planning' ? null : 'planning')}
            >
              {editingSection === 'planning' ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {editingSection === 'planning' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="pt-0 pb-4">
                <Separator className="my-3" />
                <div className="space-y-4">
                  {/* Days selection */}
                  <div className="space-y-2">
                    <Label>Jours travaillés</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day.id}
                          onClick={() => toggleDay(day.id)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            selectedDays.includes(day.id)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hours per day */}
                  <div className="space-y-2">
                    <Label>Heures par jour</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[workHoursPerDay]}
                        onValueChange={([v]) => setWorkHoursPerDay(v)}
                        min={4}
                        max={14}
                        step={1}
                        className="flex-1"
                      />
                      <Badge variant="secondary" className="w-16 justify-center">
                        {workHoursPerDay}h
                      </Badge>
                    </div>
                  </div>

                  {/* Daily targets preview */}
                  {dailyTargets.length > 0 && (
                    <div className="space-y-2">
                      <Label>Objectifs journaliers calculés</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {dailyTargets.map((day) => (
                          <div 
                            key={day.id}
                            className="bg-muted/50 rounded-lg p-2 text-center"
                          >
                            <p className="text-xs text-muted-foreground">{day.fullLabel}</p>
                            <p className="text-sm font-bold">{day.dailyTarget}€</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={() => saveSection('planning')} disabled={saving} className="w-full">
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Courses Objective Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Objectif courses</CardTitle>
                <p className="text-2xl font-bold text-foreground">{targetCourses} / mois</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setEditingSection(editingSection === 'courses' ? null : 'courses')}
            >
              {editingSection === 'courses' ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {editingSection === 'courses' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="pt-0 pb-4">
                <Separator className="my-3" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre de courses par mois</Label>
                    <Input
                      type="number"
                      value={targetCourses}
                      onChange={(e) => setTargetCourses(parseInt(e.target.value) || 0)}
                      min={10}
                      max={1000}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      ≈ {Math.round(targetCourses / 4)} courses/semaine • {Math.round(targetCourses / 22)} courses/jour
                    </p>
                  </div>
                  <Button onClick={() => saveSection('courses')} disabled={saving} className="w-full">
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Km Objective Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Objectif kilomètres</CardTitle>
                <p className="text-2xl font-bold text-foreground">{targetKm.toLocaleString()} km / mois</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setEditingSection(editingSection === 'km' ? null : 'km')}
            >
              {editingSection === 'km' ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {editingSection === 'km' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <CardContent className="pt-0 pb-4">
                <Separator className="my-3" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Kilomètres par mois</Label>
                    <Input
                      type="number"
                      value={targetKm}
                      onChange={(e) => setTargetKm(parseInt(e.target.value) || 0)}
                      min={100}
                      max={50000}
                      step={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      ≈ {Math.round(targetKm / 4).toLocaleString()} km/semaine • {Math.round(targetKm / 22)} km/jour
                    </p>
                  </div>
                  <Button onClick={() => saveSection('km')} disabled={saving} className="w-full">
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Summary */}
      {hasData && (
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Récapitulatif</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">CA mensuel visé</p>
                <p className="font-bold">{targetRevenue.toLocaleString()}€</p>
              </div>
              <div>
                <p className="text-muted-foreground">Clients cible</p>
                <p className="font-bold">{targetClients} clients</p>
              </div>
              <div>
                <p className="text-muted-foreground">Courses / mois</p>
                <p className="font-bold">{targetCourses}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Km / mois</p>
                <p className="font-bold">{targetKm.toLocaleString()} km</p>
              </div>
              <div>
                <p className="text-muted-foreground">Indépendance</p>
                <p className="font-bold">{solocabPercentage}% privé</p>
              </div>
              <div>
                <p className="text-muted-foreground">Rythme</p>
                <p className="font-bold">{selectedDays.length}j × {workHoursPerDay}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
