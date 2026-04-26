import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  TrendingUp, Users, Smartphone, Calendar, Car, MapPin,
  Edit3, Save, Check, Loader2, Settings2, ChevronDown, ChevronUp,
  Hand, QrCode, UserPlus, Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ObjectivesData {
  target_monthly_revenue?: number;
  target_weekly_revenue?: number;
  target_direct_clients?: number;
  target_monthly_courses?: number;
  target_monthly_km?: number;
  platform_percentage?: number;
  solocab_percentage?: number;
  work_hours_per_day?: number;
  work_days_per_week?: number;
  selected_work_days?: string[];
  daily_targets?: Record<string, { target: number; weight: number }>;
  estimated_hourly_target?: number;
  goals_completed_at?: string;
  // Acquisition targets (mensuel)
  target_cards_proposed?: number;
  target_qr_scans?: number;
  target_independence_pct?: number;
}

interface InlineObjectivesEditorProps {
  driverId: string;
  onUpdate?: () => void;
}

const DAYS = [
  { id: 'lundi', label: 'L', weight: 0.7, index: 1 },
  { id: 'mardi', label: 'Ma', weight: 0.85, index: 2 },
  { id: 'mercredi', label: 'Me', weight: 0.95, index: 3 },
  { id: 'jeudi', label: 'J', weight: 0.95, index: 4 },
  { id: 'vendredi', label: 'V', weight: 1.15, index: 5 },
  { id: 'samedi', label: 'S', weight: 1.2, index: 6 },
  { id: 'dimanche', label: 'D', weight: 1.2, index: 0 },
];

export function InlineObjectivesEditor({ driverId, onUpdate }: InlineObjectivesEditorProps) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const [targetRevenue, setTargetRevenue] = useState(5000);
  const [targetClients, setTargetClients] = useState(15);
  const [targetCourses, setTargetCourses] = useState(100);
  const [targetKm, setTargetKm] = useState(2000);
  const [platformPct, setPlatformPct] = useState(80);
  const [selectedDays, setSelectedDays] = useState<string[]>(['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']);
  const [workHours, setWorkHours] = useState(8);
  // Acquisition targets (mensuels)
  const [targetCardsProposed, setTargetCardsProposed] = useState(60);
  const [targetQrScans, setTargetQrScans] = useState(30);
  const [targetIndependencePct, setTargetIndependencePct] = useState(20);
  const [objectivesData, setObjectivesData] = useState<ObjectivesData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: driver } = await supabase
          .from('drivers')
          .select('objectives_data')
          .eq('id', driverId)
          .single();
        if (cancelled) return;
        if (driver?.objectives_data) {
          const d = driver.objectives_data as ObjectivesData;
          setObjectivesData(d);
          if (d.target_monthly_revenue) setTargetRevenue(d.target_monthly_revenue);
          if (d.target_direct_clients) setTargetClients(d.target_direct_clients);
          if (d.target_monthly_courses) setTargetCourses(d.target_monthly_courses);
          if (d.target_monthly_km) setTargetKm(d.target_monthly_km);
          if (d.platform_percentage !== undefined) setPlatformPct(d.platform_percentage);
          if (d.selected_work_days) setSelectedDays(d.selected_work_days);
          if (d.work_hours_per_day) setWorkHours(d.work_hours_per_day);
          if (d.target_cards_proposed !== undefined) setTargetCardsProposed(d.target_cards_proposed);
          if (d.target_qr_scans !== undefined) setTargetQrScans(d.target_qr_scans);
          if (d.target_independence_pct !== undefined) setTargetIndependencePct(d.target_independence_pct);
        }
      } catch (e) {
        console.error('Error fetching objectives:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [driverId]);

  const solocabPct = 100 - platformPct;

  const saveAll = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);

    try {
      const weeklyRev = Math.round(targetRevenue / 4);
      const totalHours = workHours * selectedDays.length * 4;
      const hourlyTarget = totalHours > 0 ? Math.round(targetRevenue / totalHours) : 0;

      const dailyTargetsMap: Record<string, { target: number; weight: number }> = {};
      const selectedDayData = DAYS.filter(d => selectedDays.includes(d.id));
      const totalWeight = selectedDayData.reduce((s, d) => s + d.weight, 0);
      selectedDayData.forEach(d => {
        dailyTargetsMap[d.id] = { target: Math.round(weeklyRev * (d.weight / totalWeight)), weight: d.weight };
      });

      const updated: ObjectivesData = {
        ...objectivesData,
        target_monthly_revenue: targetRevenue,
        target_weekly_revenue: weeklyRev,
        target_direct_clients: targetClients,
        target_monthly_courses: targetCourses,
        target_monthly_km: targetKm,
        platform_percentage: platformPct,
        solocab_percentage: solocabPct,
        work_hours_per_day: workHours,
        work_days_per_week: selectedDays.length,
        selected_work_days: selectedDays,
        daily_targets: dailyTargetsMap,
        estimated_hourly_target: hourlyTarget,
        target_cards_proposed: targetCardsProposed,
        target_qr_scans: targetQrScans,
        target_independence_pct: targetIndependencePct,
      };

      const mult = {
        daily: { rev: 1/22, cli: 1/22, hrs: 1, crs: 1/22, km: 1/22, cards: 1/22, scans: 1/22 },
        weekly: { rev: 1/4, cli: 1/4, hrs: selectedDays.length, crs: 1/4, km: 1/4, cards: 1/4, scans: 1/4 },
        monthly: { rev: 1, cli: 1, hrs: selectedDays.length * 4, crs: 1, km: 1, cards: 1, scans: 1 },
        yearly: { rev: 12, cli: 12, hrs: selectedDays.length * 4 * 12, crs: 12, km: 12, cards: 12, scans: 12 },
      };

      const objRows = (['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => ({
        driver_id: driverId,
        period_type: p,
        revenue_target: Math.round(targetRevenue * mult[p].rev),
        new_clients_target: Math.round(targetClients * mult[p].cli),
        hours_target: Math.round(workHours * mult[p].hrs),
        courses_target: Math.round(targetCourses * mult[p].crs),
        km_target: Math.round(targetKm * mult[p].km),
        cards_proposed_target: Math.round(targetCardsProposed * mult[p].cards),
        qr_scans_target: Math.round(targetQrScans * mult[p].scans),
        direct_clients_target: Math.round(targetClients * mult[p].cli),
        independence_percentage_target: targetIndependencePct,
        is_active: true,
      }));

      const schedRows = DAYS.map(d => ({
        driver_id: driverId,
        day_of_week: d.index,
        is_working_day: selectedDays.includes(d.id),
        target_hours: selectedDays.includes(d.id) ? workHours : 0,
      }));

      await Promise.all([
        supabase.from('drivers').update({ objectives_data: JSON.parse(JSON.stringify(updated)) }).eq('id', driverId),
        supabase.from('driver_objectives').upsert(objRows, { onConflict: 'driver_id,period_type' }),
        supabase.from('driver_work_schedules').upsert(schedRows, { onConflict: 'driver_id,day_of_week' }),
      ]);

      setObjectivesData(updated);
      setEditing(false);
      toast.success('Objectifs mis à jour !');
      if (onUpdate) setTimeout(onUpdate, 100);
    } catch (e) {
      console.error('Error saving:', e);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }, [driverId, targetRevenue, targetClients, targetCourses, targetKm, platformPct, solocabPct, workHours, selectedDays, objectivesData, onUpdate, targetCardsProposed, targetQrScans, targetIndependencePct]);

  if (loading) {
    return <Card className="animate-pulse"><CardContent className="p-4"><div className="h-20 bg-muted/30 rounded-lg" /></CardContent></Card>;
  }

  // View mode: compact summary
  if (!editing) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Mes Objectifs</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-8 text-xs gap-1.5">
              <Edit3 className="w-3 h-3" />
              Modifier
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <ObjectiveSummaryItem icon={<TrendingUp className="w-3.5 h-3.5 text-green-500" />} label="CA/mois" value={`${targetRevenue.toLocaleString()}€`} />
            <ObjectiveSummaryItem icon={<Car className="w-3.5 h-3.5 text-blue-500" />} label="Courses" value={`${targetCourses}`} />
            <ObjectiveSummaryItem icon={<Users className="w-3.5 h-3.5 text-purple-500" />} label="Clients" value={`${targetClients}`} />
            <ObjectiveSummaryItem icon={<MapPin className="w-3.5 h-3.5 text-red-500" />} label="Km" value={`${targetKm.toLocaleString()}`} />
            <ObjectiveSummaryItem icon={<Smartphone className="w-3.5 h-3.5 text-amber-500" />} label="Privé" value={`${solocabPct}%`} />
            <ObjectiveSummaryItem icon={<Calendar className="w-3.5 h-3.5 text-cyan-500" />} label="Planning" value={`${selectedDays.length}j × ${workHours}h`} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edit mode: all fields visible
  return (
    <Card className="overflow-hidden border-primary/30">
      <CardContent className="p-4 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Modifier mes objectifs</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="h-8 text-xs">
            Annuler
          </Button>
        </div>

        {/* Revenue */}
        <EditRow icon={<TrendingUp className="w-4 h-4 text-green-500" />} label="CA mensuel (€)">
          <Input
            type="number"
            value={targetRevenue}
            onChange={e => setTargetRevenue(parseInt(e.target.value) || 0)}
            className="h-10 text-lg font-bold text-center"
            min={500} max={50000} step={500}
          />
          <p className="text-[10px] text-muted-foreground mt-1">≈ {Math.round(targetRevenue / 4).toLocaleString()}€/sem • {(targetRevenue * 12).toLocaleString()}€/an</p>
        </EditRow>

        {/* Courses */}
        <EditRow icon={<Car className="w-4 h-4 text-blue-500" />} label="Courses / mois">
          <Input
            type="number"
            value={targetCourses}
            onChange={e => setTargetCourses(parseInt(e.target.value) || 0)}
            className="h-10 text-lg font-bold text-center"
            min={10} max={1000} step={5}
          />
          <p className="text-[10px] text-muted-foreground mt-1">≈ {Math.round(targetCourses / 4)}/sem • {Math.round(targetCourses / 22)}/jour</p>
        </EditRow>

        {/* Clients */}
        <EditRow icon={<Users className="w-4 h-4 text-purple-500" />} label="Clients directs">
          <Input
            type="number"
            value={targetClients}
            onChange={e => setTargetClients(parseInt(e.target.value) || 0)}
            className="h-10 text-lg font-bold text-center"
            min={1} max={200}
          />
        </EditRow>

        {/* Km */}
        <EditRow icon={<MapPin className="w-4 h-4 text-red-500" />} label="Kilomètres / mois">
          <Input
            type="number"
            value={targetKm}
            onChange={e => setTargetKm(parseInt(e.target.value) || 0)}
            className="h-10 text-lg font-bold text-center"
            min={100} max={50000} step={100}
          />
        </EditRow>

        {/* Independence slider */}
        <EditRow icon={<Smartphone className="w-4 h-4 text-amber-500" />} label="Indépendance">
          <Slider
            value={[platformPct]}
            onValueChange={([v]) => setPlatformPct(v)}
            min={0} max={100} step={5}
          />
          <div className="flex gap-1 h-2.5 rounded-full overflow-hidden mt-2">
            <div className="bg-destructive transition-all" style={{ width: `${platformPct}%` }} />
            <div className="bg-primary transition-all" style={{ width: `${solocabPct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span className="text-destructive">Apps: {platformPct}%</span>
            <span className="text-primary">Privé: {solocabPct}%</span>
          </div>
        </EditRow>

        {/* Planning */}
        <EditRow icon={<Calendar className="w-4 h-4 text-cyan-500" />} label="Planning">
          <div className="flex gap-1.5 mb-3">
            {DAYS.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDays(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id])}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-medium transition-colors",
                  selectedDays.includes(d.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Heures/jour</span>
            <Slider value={[workHours]} onValueChange={([v]) => setWorkHours(v)} min={4} max={14} step={1} className="flex-1" />
            <Badge variant="secondary" className="w-10 justify-center text-xs">{workHours}h</Badge>
          </div>
        </EditRow>

        {/* Save button */}
        <Button onClick={saveAll} disabled={saving} className="w-full h-12 text-base font-semibold" size="lg">
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enregistrement...</>
          ) : (
            <><Check className="w-4 h-4 mr-2" />Enregistrer tous les objectifs</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function ObjectiveSummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-lg p-2.5 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function EditRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      {children}
    </div>
  );
}
