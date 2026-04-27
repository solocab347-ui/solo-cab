import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Share2, 
  BadgePercent, 
  Shield, 
  ArrowRight, 
  Loader2,
  CheckCircle,
  Users,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OnboardingWorkScheduleStepProps {
  driverId: string;
  onComplete: () => void;
}

interface DaySchedule {
  day_of_week: number;
  label: string;
  shortLabel: string;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day_of_week: 1, label: 'Lundi', shortLabel: 'Lun', is_available: true, start_time: '08:00', end_time: '20:00' },
  { day_of_week: 2, label: 'Mardi', shortLabel: 'Mar', is_available: true, start_time: '08:00', end_time: '20:00' },
  { day_of_week: 3, label: 'Mercredi', shortLabel: 'Mer', is_available: true, start_time: '08:00', end_time: '20:00' },
  { day_of_week: 4, label: 'Jeudi', shortLabel: 'Jeu', is_available: true, start_time: '08:00', end_time: '20:00' },
  { day_of_week: 5, label: 'Vendredi', shortLabel: 'Ven', is_available: true, start_time: '08:00', end_time: '20:00' },
  { day_of_week: 6, label: 'Samedi', shortLabel: 'Sam', is_available: false, start_time: '09:00', end_time: '18:00' },
  { day_of_week: 0, label: 'Dimanche', shortLabel: 'Dim', is_available: false, start_time: '09:00', end_time: '18:00' },
];

const BENEFITS = [
  {
    icon: Share2,
    title: 'Partage intelligent',
    description: 'Les demandes hors de tes horaires sont automatiquement proposées au réseau de chauffeurs partenaires.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: BadgePercent,
    title: 'Commission automatique',
    description: 'Tu touches une commission de 20% à 25% (défaut 22%) sur chaque course partagée et acceptée par un partenaire.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Shield,
    title: 'Réseau sécurisé Stripe',
    description: 'Tous les paiements et frais de transaction passent par Stripe Connect. Aucun argent perdu, tout est traçable.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
];

export function OnboardingWorkScheduleStep({ driverId, onComplete }: OnboardingWorkScheduleStepProps) {
  const [phase, setPhase] = useState<'explain' | 'schedule'>('explain');
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing schedule if any
  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const { data } = await supabase
          .from('driver_availability_slots')
          .select('*')
          .eq('driver_id', driverId)
          .eq('slot_type', 'recurring')
          .order('day_of_week');

        if (data && data.length > 0) {
          setSchedule(prev => prev.map(day => {
            const existing = data.find(d => d.day_of_week === day.day_of_week);
            if (existing) {
              return {
                ...day,
                is_available: existing.is_available ?? true,
                start_time: existing.start_time || day.start_time,
                end_time: existing.end_time || day.end_time,
              };
            }
            return day;
          }));
        }
      } catch (error) {
        console.error('Error loading schedule:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSchedule();
  }, [driverId]);

  const updateDay = (dayOfWeek: number, field: keyof DaySchedule, value: any) => {
    setSchedule(prev => prev.map(day =>
      day.day_of_week === dayOfWeek ? { ...day, [field]: value } : day
    ));
  };

  const activeDays = schedule.filter(d => d.is_available).length;

  const handleSave = async () => {
    if (activeDays < 1) {
      toast.error('Active au moins 1 jour de travail');
      return;
    }

    setSaving(true);
    try {
      // Delete existing recurring slots
      await supabase
        .from('driver_availability_slots')
        .delete()
        .eq('driver_id', driverId)
        .eq('slot_type', 'recurring');

      // Insert all 7 days
      const slotsToInsert = schedule.map(day => ({
        driver_id: driverId,
        day_of_week: day.day_of_week,
        start_time: day.start_time,
        end_time: day.end_time,
        is_available: day.is_available,
        slot_type: 'recurring' as const,
      }));

      const { error } = await supabase
        .from('driver_availability_slots')
        .insert(slotsToInsert);

      if (error) throw error;

      // Update driver objectives_data with schedule info
      const { data: existingDriver } = await supabase
        .from('drivers')
        .select('objectives_data')
        .eq('id', driverId)
        .single();

      const existingData = (existingDriver?.objectives_data as Record<string, unknown>) || {};
      
      await supabase
        .from('drivers')
        .update({
          objectives_data: {
            ...existingData,
            selected_work_days: schedule.filter(d => d.is_available).map(d => d.label.toLowerCase()),
            schedule_configured_at: new Date().toISOString(),
          },
          onboarding_step: 'settings',
        })
        .eq('id', driverId);

      // Re-check conflicts
      supabase.functions.invoke('batch-check-schedule-conflicts', {
        body: { driver_id: driverId }
      }).catch(console.error);

      toast.success('Planning configuré !');
      onComplete();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Phase 1: Explain why
  if (phase === 'explain') {
    return (
      <div className="flex flex-col h-full justify-center px-2">
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4"
          >
            <Clock className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Définis tes horaires de travail
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Sur SoloCab, tes horaires te permettent de gagner plus, même quand tu ne travailles pas.
          </p>
        </div>

        <div className="max-w-sm mx-auto w-full space-y-3 mb-6">
          {BENEFITS.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.15 }}
              className="flex items-start gap-3 p-3 bg-card border border-border rounded-xl"
            >
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", benefit.bg)}>
                <benefit.icon className={cn("w-4.5 h-4.5", benefit.color)} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{benefit.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{benefit.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Example scenario */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="max-w-sm mx-auto w-full bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6"
        >
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Exemple concret</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tu travailles de 8h à 20h. Un client demande une course à 22h → elle est automatiquement proposée au réseau. 
                Un partenaire l'accepte pour 45€ → <span className="font-semibold text-emerald-500">tu touches 9€ de frais de transaction</span> sans avoir conduit !
              </p>
            </div>
          </div>
        </motion.div>

        <div className="max-w-sm mx-auto w-full">
          <Button 
            onClick={() => setPhase('schedule')} 
            className="w-full h-12 text-sm font-semibold"
          >
            Configurer mes horaires
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Phase 2: Schedule editor
  return (
    <div className="flex flex-col h-full px-1">
      <div className="text-center mb-4 pt-2">
        <h2 className="text-lg font-bold text-foreground mb-1">
          Tes horaires par jour
        </h2>
        <p className="text-xs text-muted-foreground">
          Active/désactive les jours et personnalise les horaires de minuit à minuit
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pb-2">
        {schedule.map((day, i) => (
          <motion.div
            key={day.day_of_week}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "p-3 rounded-xl border transition-all",
              day.is_available
                ? "bg-card border-primary/20"
                : "bg-muted/30 border-border/50"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={day.is_available}
                  onCheckedChange={(v) => updateDay(day.day_of_week, 'is_available', v)}
                />
                <span className={cn(
                  "text-sm font-semibold",
                  day.is_available ? "text-foreground" : "text-muted-foreground"
                )}>
                  {day.label}
                </span>
              </div>
              {day.is_available ? (
                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Actif
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Repos</Badge>
              )}
            </div>

            {day.is_available && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center gap-2 mt-2"
              >
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Début</label>
                  <Input
                    type="time"
                    value={day.start_time}
                    onChange={(e) => updateDay(day.day_of_week, 'start_time', e.target.value)}
                    className="h-9 text-sm text-center"
                  />
                </div>
                <span className="text-muted-foreground mt-4">→</span>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground mb-0.5 block">Fin</label>
                  <Input
                    type="time"
                    value={day.end_time}
                    onChange={(e) => updateDay(day.day_of_week, 'end_time', e.target.value)}
                    className="h-9 text-sm text-center"
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}

        {/* Info footer */}
        <div className="bg-muted/30 rounded-xl p-3 mt-2">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">{activeDays} jour{activeDays > 1 ? 's' : ''} actif{activeDays > 1 ? 's' : ''}</span> — 
              Les courses demandées en dehors de ces créneaux seront signalées et pourront être partagées avec le réseau pour te générer des frais de transaction.
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex-shrink-0 pt-2 pb-1">
        <Button
          onClick={handleSave}
          disabled={saving || activeDays < 1}
          className="w-full h-12 text-sm font-semibold"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Valider mon planning
        </Button>
      </div>
    </div>
  );
}
