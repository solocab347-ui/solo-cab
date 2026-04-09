import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Users, Star, Euro, Globe, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PUBLIC_DRIVERS_QUERY_KEY, PUBLIC_DRIVER_PROFILE_KEY } from '@/hooks/usePublicDriverProfile';

interface PublicProfileVisibilitySettingsProps {
  userId: string;
  driverProfile: any;
  onUpdate?: () => void;
}

export const PublicProfileVisibilitySettings: React.FC<PublicProfileVisibilitySettingsProps> = ({
  userId,
  driverProfile,
  onUpdate
}) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  
  // Visibility states synced with driverProfile
  const [visibleToDrivers, setVisibleToDrivers] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showRatingPublic, setShowRatingPublic] = useState(false);
  const [showRatingPartners, setShowRatingPartners] = useState(false);
  const [showPricingPartners, setShowPricingPartners] = useState(false);
  // Le profil public est toujours activé automatiquement

  useEffect(() => {
    if (driverProfile) {
      setVisibleToDrivers(driverProfile.visible_to_drivers ?? false);
      setShowPhone(driverProfile.show_phone ?? false);
      setShowEmail(driverProfile.show_email ?? false);
      setShowRatingPublic(driverProfile.show_rating_public ?? false);
      setShowRatingPartners(driverProfile.show_rating_partners ?? false);
      setShowPricingPartners(driverProfile.show_pricing_partners ?? false);
      // profil public toujours activé
    }
  }, [driverProfile]);

  const updateSetting = async (field: string, value: boolean) => {
    if (!driverProfile?.id) return;

    try {
      // Mise à jour standard
      const updateData: Record<string, boolean> = { [field]: value };
      const { error } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', driverProfile.id);

      if (error) throw error;

      // Update local state
      switch (field) {
        case 'visible_to_drivers':
          setVisibleToDrivers(value);
          break;
        case 'show_phone':
          setShowPhone(value);
          break;
        case 'show_email':
          setShowEmail(value);
          break;
        case 'show_rating_public':
          setShowRatingPublic(value);
          break;
        case 'show_rating_partners':
          setShowRatingPartners(value);
          break;
        case 'show_pricing_partners':
          setShowPricingPartners(value);
          break;
        // public_profile_enabled n'est plus modifiable (toujours true)
      }

      // Invalider les caches pour synchronisation instantanée
      queryClient.invalidateQueries({ queryKey: [PUBLIC_DRIVERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PUBLIC_DRIVER_PROFILE_KEY] });

      toast.success('Paramètre mis à jour');
      onUpdate?.();
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  if (!driverProfile) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Info: Profil public toujours actif */}
      <Card className="bg-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Profil public actif
          </CardTitle>
          <CardDescription>
            Votre profil est automatiquement visible sur la vitrine SoloCab.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Visibilité pour les partenaires chauffeurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visibilité pour les partenaires
          </CardTitle>
          <CardDescription>
            Choisissez qui peut vous trouver et vous proposer des partenariats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <Label htmlFor="visible-drivers-public" className="font-medium">
                  Visible pour les chauffeurs partenaires
                </Label>
                <p className="text-sm text-muted-foreground">
                  Les autres chauffeurs peuvent vous proposer des partenariats
                </p>
              </div>
            </div>
            <Switch
              id="visible-drivers-public"
              checked={visibleToDrivers}
              onCheckedChange={(value) => updateSetting('visible_to_drivers', value)}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Informations de contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Informations de contact
          </CardTitle>
          <CardDescription>
            Contrôlez quelles informations de contact sont visibles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-green-500" />
              <div>
                <Label htmlFor="show-phone-public" className="font-medium">
                  Afficher mon téléphone
                </Label>
                <p className="text-sm text-muted-foreground">
                  Votre numéro de téléphone est visible sur votre profil
                </p>
              </div>
            </div>
            <Switch
              id="show-phone-public"
              checked={showPhone}
              onCheckedChange={(value) => updateSetting('show_phone', value)}
              disabled={loading}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <Label htmlFor="show-email-public" className="font-medium">
                  Afficher mon email
                </Label>
                <p className="text-sm text-muted-foreground">
                  Votre email est visible sur votre profil
                </p>
              </div>
            </div>
            <Switch
              id="show-email-public"
              checked={showEmail}
              onCheckedChange={(value) => updateSetting('show_email', value)}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Confidentialité notes et tarifs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="h-5 w-5" />
            Confidentialité des notes et tarifs
          </CardTitle>
          <CardDescription>
            Contrôlez la visibilité de vos notes et tarifs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Notes toujours visibles */}
          <div className="flex items-center gap-3 py-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <div>
              <Label className="font-medium">Notes</Label>
              <p className="text-sm text-muted-foreground">
                Votre note est toujours visible publiquement et par les partenaires
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Euro className="h-5 w-5 text-emerald-500" />
              <div>
                <Label htmlFor="show-pricing-partners-setting" className="font-medium">
                  Afficher mes tarifs aux partenaires
                </Label>
                <p className="text-sm text-muted-foreground">
                  Vos partenaires peuvent voir vos tarifs (base, km, horaire)
                </p>
              </div>
            </div>
            <Switch
              id="show-pricing-partners-setting"
              checked={showPricingPartners}
              onCheckedChange={(value) => updateSetting('show_pricing_partners', value)}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicProfileVisibilitySettings;
