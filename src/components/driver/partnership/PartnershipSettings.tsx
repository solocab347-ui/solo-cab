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
  Phone, 
  Eye,
  Loader2,
  Copy,
  Check,
  DollarSign,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PartnershipSettingsProps {
  driverId: string | null;
}

export function PartnershipSettings({ driverId }: PartnershipSettingsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [sharingNumber, setSharingNumber] = useState<string | null>(null);
  const [showPhoneForSharing, setShowPhoneForSharing] = useState(false);
  const [showPricingPartners, setShowPricingPartners] = useState(false);
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
          show_phone_for_sharing,
          show_pricing_partners,
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
      setShowPhoneForSharing(data.show_phone_for_sharing || false);
      setShowPricingPartners((data as any).show_pricing_partners || false);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (field: string, value: boolean) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('drivers')
        .update({ [field]: value })
        .eq('user_id', user?.id);

      if (error) throw error;

      switch (field) {
        case 'show_phone_for_sharing':
          setShowPhoneForSharing(value);
          break;
        case 'show_pricing_partners':
          setShowPricingPartners(value);
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
            Paramètres de partenariat
          </CardTitle>
          <CardDescription>
            Cette fonctionnalité est réservée aux chauffeurs indépendants.
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
            Partagez ce numéro unique avec d'autres chauffeurs pour créer des partenariats
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

      {/* Contact & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Paramètres de contact
          </CardTitle>
          <CardDescription>
            Contrôlez les informations partagées avec vos partenaires
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phone Visibility */}
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Phone className="h-5 w-5 text-green-500" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Afficher mon Téléphone</Label>
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

          {/* Pricing for Partners */}
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Tarifs pour les Partenaires</Label>
                <p className="text-sm text-muted-foreground">
                  Afficher vos tarifs aux partenaires chauffeurs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showPricingPartners && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  Visible
                </Badge>
              )}
              <Switch
                checked={showPricingPartners}
                onCheckedChange={(checked) => updateSetting('show_pricing_partners', checked)}
                disabled={updating}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
