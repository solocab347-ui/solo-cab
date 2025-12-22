import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Users, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SharingAvailabilityToggleProps {
  onAvailabilityChange?: (available: boolean) => void;
}

export function SharingAvailabilityToggle({ onAvailabilityChange }: SharingAvailabilityToggleProps) {
  const { user } = useAuth();
  const [sharingNumber, setSharingNumber] = useState<string | null>(null);
  const [sharingAvailable, setSharingAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFleetDriver, setIsFleetDriver] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadDriverInfo();
    }
  }, [user?.id]);

  const loadDriverInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('sharing_number, sharing_available, is_fleet_driver, fleet_manager_id')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      // Vérifier si c'est un chauffeur de flotte
      const isFleet = data.is_fleet_driver || data.fleet_manager_id !== null;
      setIsFleetDriver(isFleet);

      if (data.sharing_number) {
        // Formater le numéro
        const formatted = `SOL-${String(data.sharing_number).padStart(4, '0')}`;
        setSharingNumber(formatted);
      }
      setSharingAvailable(data.sharing_available || false);
    } catch (error) {
      console.error('Error loading driver info:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (checked: boolean) => {
    if (isFleetDriver) {
      toast.error('Cette fonctionnalité est réservée aux chauffeurs indépendants');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          sharing_available: checked,
          sharing_available_since: checked ? new Date().toISOString() : null,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      setSharingAvailable(checked);
      onAvailabilityChange?.(checked);
      toast.success(checked 
        ? 'Vous êtes maintenant visible pour les partenariats' 
        : 'Vous n\'êtes plus visible pour les partenariats'
      );
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  const copyNumber = async () => {
    if (!sharingNumber) return;
    
    try {
      await navigator.clipboard.writeText(sharingNumber);
      setCopied(true);
      toast.success('Numéro copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isFleetDriver) {
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Users className="h-5 w-5" />
            Partage de courses
          </CardTitle>
          <CardDescription className="text-amber-700">
            Cette fonctionnalité est réservée aux chauffeurs indépendants. 
            Les chauffeurs de flotte doivent passer par leur gestionnaire.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Mon numéro de partage
        </CardTitle>
        <CardDescription>
          Partagez ce numéro avec d'autres chauffeurs pour créer des partenariats
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Numéro de partage */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Votre numéro unique</p>
            <p className="text-2xl font-bold tracking-wider">{sharingNumber || 'Non attribué'}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={copyNumber}
            disabled={!sharingNumber}
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Toggle disponibilité */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="sharing-toggle" className="text-base font-medium">
              Disponible pour les partenariats
            </Label>
            <p className="text-sm text-muted-foreground">
              Permettre aux autres chauffeurs de vous trouver et vous proposer des partenariats
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sharingAvailable && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Visible
              </Badge>
            )}
            <Switch
              id="sharing-toggle"
              checked={sharingAvailable}
              onCheckedChange={toggleAvailability}
              disabled={updating}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
