import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Users, 
  Building2, 
  Briefcase, 
  Phone, 
  Eye,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface PartnershipSettingsProps {
  driverId: string | null;
}

export function PartnershipSettings({ driverId }: PartnershipSettingsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Settings state
  const [sharingNumber, setSharingNumber] = useState<string | null>(null);
  const [sharingAvailable, setSharingAvailable] = useState(false);
  const [showPhoneForSharing, setShowPhoneForSharing] = useState(false);
  const [visibleToFleetManagers, setVisibleToFleetManagers] = useState(false);
  const [visibleToCompanies, setVisibleToCompanies] = useState(false);
  const [visibleToDrivers, setVisibleToDrivers] = useState(false);
  const [isFleetDriver, setIsFleetDriver] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          sharing_number, 
          sharing_available, 
          show_phone_for_sharing,
          visible_to_fleet_managers,
          is_fleet_driver,
          fleet_manager_id
        `)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setIsFleetDriver(data.is_fleet_driver || data.fleet_manager_id !== null);
      
      if (data.sharing_number) {
        setSharingNumber(`SOLO-${String(data.sharing_number).padStart(6, '0')}`);
      }
      setSharingAvailable(data.sharing_available || false);
      setShowPhoneForSharing(data.show_phone_for_sharing || false);
      setVisibleToFleetManagers(data.visible_to_fleet_managers || false);
      // Default: if sharing is available, visible to drivers
      setVisibleToDrivers(data.sharing_available || false);
      // Companies can see if visible to fleet
      setVisibleToCompanies(data.visible_to_fleet_managers || false);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (field: string, value: boolean) => {
    if (isFleetDriver) {
      toast.error('Cette fonctionnalité est réservée aux chauffeurs indépendants');
      return;
    }

    setUpdating(true);
    try {
      const updates: Record<string, any> = { [field]: value };
      
      // If enabling sharing, also set timestamp
      if (field === 'sharing_available' && value) {
        updates.sharing_available_since = new Date().toISOString();
      }

      const { error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      switch (field) {
        case 'sharing_available':
          setSharingAvailable(value);
          setVisibleToDrivers(value);
          break;
        case 'show_phone_for_sharing':
          setShowPhoneForSharing(value);
          break;
        case 'visible_to_fleet_managers':
          setVisibleToFleetManagers(value);
          setVisibleToCompanies(value);
          break;
      }

      toast.success('Paramètre mis à jour');
    } catch (error) {
      console.error('Error updating setting:', error);
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isFleetDriver) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <Settings className="h-5 w-5" />
            Paramètres de visibilité
          </CardTitle>
          <CardDescription>
            Cette fonctionnalité est réservée aux chauffeurs indépendants.
            Les chauffeurs de flotte doivent passer par leur gestionnaire.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sharing Number Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5 text-primary" />
            Mon Numéro de Partage
          </CardTitle>
          <CardDescription>
            Partagez ce numéro unique avec d'autres chauffeurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-background/80 rounded-lg border border-border/50">
            <div>
              <p className="text-sm text-muted-foreground">Votre numéro unique</p>
              <p className="text-2xl font-bold font-mono tracking-wider text-primary">
                {sharingNumber || 'Non attribué'}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={copyNumber}
              disabled={!sharingNumber}
              className="shrink-0"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Visibilité & Disponibilité
          </CardTitle>
          <CardDescription>
            Configurez qui peut vous trouver et vous contacter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visibility for Drivers */}
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-base font-medium">
                  Visible aux Chauffeurs
                </Label>
                <p className="text-sm text-muted-foreground">
                  Les autres chauffeurs peuvent vous trouver pour des partenariats
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sharingAvailable && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  Visible
                </Badge>
              )}
              <Switch
                checked={sharingAvailable}
                onCheckedChange={(checked) => updateSetting('sharing_available', checked)}
                disabled={updating}
              />
            </div>
          </div>

          {/* Visibility for Companies */}
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Building2 className="h-5 w-5 text-purple-500" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-base font-medium">
                  Visible aux Entreprises
                </Label>
                <p className="text-sm text-muted-foreground">
                  Les entreprises peuvent vous découvrir pour des accords
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {visibleToCompanies && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                  Visible
                </Badge>
              )}
              <Switch
                checked={visibleToFleetManagers}
                onCheckedChange={(checked) => updateSetting('visible_to_fleet_managers', checked)}
                disabled={updating}
              />
            </div>
          </div>

          {/* Visibility for Fleet Managers */}
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Briefcase className="h-5 w-5 text-amber-500" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-base font-medium">
                  Visible aux Gestionnaires de Flotte
                </Label>
                <p className="text-sm text-muted-foreground">
                  Les gestionnaires peuvent vous proposer de rejoindre leur réseau
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {visibleToFleetManagers && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  Visible
                </Badge>
              )}
              <Switch
                checked={visibleToFleetManagers}
                onCheckedChange={(checked) => updateSetting('visible_to_fleet_managers', checked)}
                disabled={updating}
              />
            </div>
          </div>

          <Separator className="my-4" />

          {/* Phone Visibility */}
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Phone className="h-5 w-5 text-green-500" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-base font-medium">
                  Afficher mon Téléphone
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permettre aux partenaires de vous contacter directement
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showPhoneForSharing && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                  Visible
                </Badge>
              )}
              <Switch
                checked={showPhoneForSharing}
                onCheckedChange={(checked) => updateSetting('show_phone_for_sharing', checked)}
                disabled={updating}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
