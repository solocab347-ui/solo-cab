import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Save,
  Loader2,
  CheckCircle,
  Share2,
  BadgePercent,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DriverAvailabilitySlotsProps {
  driverId: string;
}

interface AvailabilitySlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  slot_type: 'recurring' | 'specific' | 'exception';
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi', shortLabel: 'Lun' },
  { value: 2, label: 'Mardi', shortLabel: 'Mar' },
  { value: 3, label: 'Mercredi', shortLabel: 'Mer' },
  { value: 4, label: 'Jeudi', shortLabel: 'Jeu' },
  { value: 5, label: 'Vendredi', shortLabel: 'Ven' },
  { value: 6, label: 'Samedi', shortLabel: 'Sam' },
  { value: 0, label: 'Dimanche', shortLabel: 'Dim' },
];

export function DriverAvailabilitySlots({ driverId }: DriverAvailabilitySlotsProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, [driverId]);

  const fetchSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_availability_slots')
        .select('*')
        .eq('driver_id', driverId)
        .eq('slot_type', 'recurring')
        .order('day_of_week');

      if (error) throw error;
      
      if (data && data.length > 0) {
        setSlots(data.map(slot => ({
          id: slot.id,
          day_of_week: slot.day_of_week || 0,
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: slot.is_available ?? true,
          slot_type: 'recurring' as const
        })));
      } else {
        setSlots(DAYS_OF_WEEK.map(day => ({
          day_of_week: day.value,
          start_time: '08:00',
          end_time: '20:00',
          is_available: day.value >= 1 && day.value <= 5,
          slot_type: 'recurring' as const
        })));
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSlot = (dayOfWeek: number, field: string, value: any) => {
    setSlots(prev => prev.map(slot => 
      slot.day_of_week === dayOfWeek 
        ? { ...slot, [field]: value }
        : slot
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from('driver_availability_slots')
        .delete()
        .eq('driver_id', driverId)
        .eq('slot_type', 'recurring');

      const slotsToInsert = slots.map(slot => ({
        driver_id: driverId,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available,
        slot_type: 'recurring'
      }));

      const { error } = await supabase
        .from('driver_availability_slots')
        .insert(slotsToInsert);

      if (error) throw error;
      
      // Re-check all upcoming courses against new schedule
      supabase.functions.invoke('batch-check-schedule-conflicts', {
        body: { driver_id: driverId }
      }).catch(console.error);
      
      setHasChanges(false);
      toast.success('Planning mis à jour — vos courses sont en cours de vérification');
      fetchSlots();
    } catch (error) {
      console.error('Error saving slots:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const activeDays = slots.filter(s => s.is_available).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Explanation banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Share2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Pourquoi définir tes horaires ?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Les courses demandées en dehors de tes horaires sont automatiquement proposées au réseau SoloCab. 
                Si un partenaire l'accepte, tu touches <span className="font-semibold text-emerald-600">15% (courses &lt; 30€) ou 20% (≥ 30€)</span> de frais de transaction.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-5 h-5 text-primary" />
            Mes horaires de travail
          </CardTitle>
          <CardDescription className="text-xs">
            Personnalise tes horaires par jour — de minuit à minuit selon tes besoins
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DAYS_OF_WEEK.map(day => {
            const slot = slots.find(s => s.day_of_week === day.value);
            if (!slot) return null;
            
            return (
              <div 
                key={day.value} 
                className={cn(
                  "p-3 rounded-xl border transition-all",
                  slot.is_available 
                    ? 'bg-card border-primary/15' 
                    : 'bg-muted/30 border-border/50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Switch
                      checked={slot.is_available}
                      onCheckedChange={(checked) => updateSlot(day.value, 'is_available', checked)}
                    />
                    <span className={cn(
                      "text-sm font-medium",
                      slot.is_available ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {day.label}
                    </span>
                  </div>
                  {slot.is_available ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Repos</Badge>
                  )}
                </div>
                
                {slot.is_available && (
                  <div className="flex items-center gap-2 mt-2.5 ml-10">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <Input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => updateSlot(day.value, 'start_time', e.target.value)}
                      className="h-8 text-sm text-center flex-1"
                    />
                    <span className="text-xs text-muted-foreground">à</span>
                    <Input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => updateSlot(day.value, 'end_time', e.target.value)}
                      className="h-8 text-sm text-center flex-1"
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Summary + Save */}
          <div className="pt-3 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>{activeDays} jour{activeDays > 1 ? 's' : ''} de travail configuré{activeDays > 1 ? 's' : ''}</span>
              {hasChanges && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="w-3 h-3" />
                  Modifications non sauvegardées
                </span>
              )}
            </div>
            
            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges} 
              className="w-full gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Sauvegarde et vérification des courses...' : 'Sauvegarder mon planning'}
            </Button>
            
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              Toutes vos courses à venir seront automatiquement re-vérifiées par rapport à vos nouveaux horaires
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
