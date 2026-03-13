import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

export function DriverAvailabilitySlots({ driverId }: DriverAvailabilitySlotsProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        // Default slots for all days
        setSlots(DAYS_OF_WEEK.map(day => ({
          day_of_week: day.value,
          start_time: '08:00',
          end_time: '20:00',
          is_available: true,
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
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing slots
      await supabase
        .from('driver_availability_slots')
        .delete()
        .eq('driver_id', driverId)
        .eq('slot_type', 'recurring');

      // Insert new slots
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
      
      toast.success('Disponibilités mises à jour');
      fetchSlots();
    } catch (error) {
      console.error('Error saving slots:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Mes disponibilités hebdomadaires
        </CardTitle>
        <CardDescription>
          Définissez vos horaires de travail pour chaque jour de la semaine
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS_OF_WEEK.map(day => {
          const slot = slots.find(s => s.day_of_week === day.value);
          if (!slot) return null;
          
          return (
            <div 
              key={day.value} 
              className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                slot.is_available 
                  ? 'bg-success/5 border-success/20' 
                  : 'bg-muted/50 border-border'
              }`}
            >
              <div className="w-24">
                <span className={`font-medium ${slot.is_available ? '' : 'text-muted-foreground'}`}>
                  {day.label}
                </span>
              </div>
              
              <Switch
                checked={slot.is_available}
                onCheckedChange={(checked) => updateSlot(day.value, 'is_available', checked)}
              />
              
              {slot.is_available ? (
                <>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={slot.start_time}
                      onChange={(e) => updateSlot(day.value, 'start_time', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">à</span>
                    <Input
                      type="time"
                      value={slot.end_time}
                      onChange={(e) => updateSlot(day.value, 'end_time', e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <Badge variant="outline" className="text-success border-success/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Disponible
                  </Badge>
                </>
              ) : (
                <Badge variant="secondary">Non disponible</Badge>
              )}
            </div>
          );
        })}

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2 mt-4">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Sauvegarder mes disponibilités
        </Button>
      </CardContent>
    </Card>
  );
}
