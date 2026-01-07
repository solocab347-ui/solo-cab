import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Star, 
  Car, 
  MapPin, 
  Building2,
  Trophy,
  Briefcase,
  CheckCircle2,
  Loader2,
  Settings,
  Sparkles
} from 'lucide-react';
import { getServiceLabel, getServiceIcon } from '@/lib/serviceLabels';
import { getEquipmentLabel, getEquipmentIcon } from '@/lib/vehicleEquipmentDisplay';
import { supabase } from '@/integrations/supabase/client';

export type PartnerType = 'driver' | 'fleet' | 'company';

interface PartnerPublicProfilePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerType: PartnerType;
  onContinue: () => void;
  partnerName?: string;
  viewOnly?: boolean;
}

interface DriverProfile {
  id: string;
  company_name?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  bio?: string;
  rating?: number;
  total_rides?: number;
  services_offered?: string[];
  vehicle_equipment?: string[];
  vehicle_photos?: string[];
  card_photo_url?: string;
  profile?: {
    full_name?: string;
    profile_photo_url?: string;
    phone?: string;
    email?: string;
  };
  show_rating_for_sharing?: boolean;
  show_rides_for_sharing?: boolean;
}

interface FleetProfile {
  id: string;
  company_name: string;
  contact_name?: string;
  description?: string;
  logo_url?: string;
  profile?: {
    full_name?: string;
    profile_photo_url?: string;
    phone?: string;
    email?: string;
  };
}

interface CompanyProfile {
  id: string;
  company_name: string;
  contact_name?: string;
  address?: string;
  logo_url?: string;
  employee_count?: number;
  preferred_vehicle_types?: string[];
}

export function PartnerPublicProfilePreview({
  open,
  onOpenChange,
  partnerId,
  partnerType,
  onContinue,
  partnerName,
  viewOnly = false
}: PartnerPublicProfilePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [fleetProfile, setFleetProfile] = useState<FleetProfile | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    if (open && partnerId) {
      fetchProfile();
    }
  }, [open, partnerId, partnerType]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      if (partnerType === 'driver') {
        const { data } = await supabase
          .from('drivers')
          .select(`
            id,
            company_name,
            vehicle_brand,
            vehicle_model,
            vehicle_color,
            bio,
            rating,
            total_rides,
            services_offered,
            vehicle_equipment,
            vehicle_photos,
            card_photo_url,
            show_rating_for_sharing,
            show_rides_for_sharing,
            profile:profiles!drivers_user_id_fkey(
              full_name,
              profile_photo_url,
              phone,
              email
            )
          `)
          .eq('id', partnerId)
          .single();
        
        if (data) {
          setDriverProfile({
            ...data,
            profile: Array.isArray(data.profile) ? data.profile[0] : data.profile
          });
        }
      } else if (partnerType === 'fleet') {
        const { data } = await supabase
          .from('fleet_managers')
          .select(`
            id,
            company_name,
            contact_name,
            description,
            logo_url,
            user_id
          `)
          .eq('id', partnerId)
          .single();
        
        if (data) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_photo_url, phone, email')
            .eq('id', data.user_id)
            .single();

          setFleetProfile({
            id: data.id,
            company_name: data.company_name,
            contact_name: data.contact_name || undefined,
            description: data.description || undefined,
            logo_url: data.logo_url || undefined,
            profile: profile || undefined
          });
        }
      } else if (partnerType === 'company') {
        const { data } = await supabase
          .from('companies')
          .select(`
            id,
            company_name,
            contact_name,
            address,
            logo_url,
            employee_count,
            preferred_vehicle_types
          `)
          .eq('id', partnerId)
          .single();
        
        if (data) {
          setCompanyProfile(data);
        }
      }
    } catch (error) {
      console.error('Error fetching partner profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPartnerTypeLabel = () => {
    switch (partnerType) {
      case 'driver': return 'Chauffeur VTC';
      case 'fleet': return 'Gestionnaire de Flotte';
      case 'company': return 'Entreprise';
    }
  };

  const getPartnerTypeIcon = () => {
    switch (partnerType) {
      case 'driver': return <Car className="h-5 w-5" />;
      case 'fleet': return <Briefcase className="h-5 w-5" />;
      case 'company': return <Building2 className="h-5 w-5" />;
    }
  };


  const renderDriverProfile = () => {
    if (!driverProfile) return null;
    
    const name = driverProfile.profile?.full_name || driverProfile.company_name || 'Chauffeur';
    const photo = driverProfile.profile?.profile_photo_url;
    const showRating = driverProfile.show_rating_for_sharing !== false;
    const showRides = driverProfile.show_rides_for_sharing !== false;
    // Use card photo or vehicle photo as main display photo
    const displayPhoto = driverProfile.card_photo_url || photo || 
      (driverProfile.vehicle_photos && driverProfile.vehicle_photos.length > 0 ? driverProfile.vehicle_photos[0] : undefined);

    return (
      <div className="space-y-4">
        {/* Photo principale centrée */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-primary/30 shadow-lg">
              <AvatarImage src={displayPhoto || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-3xl font-bold">
                {name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5 shadow-md">
                Chauffeur VTC
              </Badge>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <h3 className="font-bold text-xl">{name}</h3>
            {driverProfile.company_name && driverProfile.company_name !== name && (
              <p className="text-sm text-muted-foreground">{driverProfile.company_name}</p>
            )}
          </div>
          
          {/* Stats - respecting visibility settings */}
          <div className="flex items-center gap-3 mt-3">
            {showRating && driverProfile.rating && driverProfile.rating > 0 && (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                <span className="font-semibold">{driverProfile.rating.toFixed(1)}</span>
              </Badge>
            )}
            {showRides && driverProfile.total_rides && driverProfile.total_rides > 0 && (
              <Badge variant="outline" className="gap-1.5 px-3 py-1">
                <Trophy className="h-4 w-4 text-primary" />
                <span className="font-medium">{driverProfile.total_rides} courses</span>
              </Badge>
            )}
          </div>
        </div>

        {/* Vehicle */}
        {(driverProfile.vehicle_brand || driverProfile.vehicle_model) && (
          <Card className="border-muted">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Car className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {[driverProfile.vehicle_brand, driverProfile.vehicle_model]
                      .filter(Boolean)
                      .join(' ')}
                  </p>
                  {driverProfile.vehicle_color && (
                    <p className="text-xs text-muted-foreground">{driverProfile.vehicle_color}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Présentation / Bio */}
        {driverProfile.bio && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Présentation
            </h4>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">"{driverProfile.bio}"</p>
            </div>
          </div>
        )}

        {/* Services */}
        {driverProfile.services_offered && driverProfile.services_offered.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Services proposés
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {driverProfile.services_offered.map((service, idx) => (
                <Badge key={idx} variant="outline" className="text-xs gap-1.5 px-2.5 py-1">
                  <span className="text-base">{getServiceIcon(service)}</span>
                  <span>{getServiceLabel(service)}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Equipment */}
        {driverProfile.vehicle_equipment && driverProfile.vehicle_equipment.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Équipements
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {driverProfile.vehicle_equipment.map((equip, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs gap-1.5 px-2.5 py-1">
                  <span className="text-base">{getEquipmentIcon(equip)}</span>
                  <span>{getEquipmentLabel(equip)}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFleetProfile = () => {
    if (!fleetProfile) return null;
    
    const name = fleetProfile.profile?.full_name || fleetProfile.contact_name || fleetProfile.company_name;
    const photo = fleetProfile.profile?.profile_photo_url || fleetProfile.logo_url;

    return (
      <div className="space-y-4">
        {/* Header */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={photo || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {fleetProfile.company_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg">{name}</p>
                <p className="text-sm text-muted-foreground">{fleetProfile.company_name}</p>
                
                <Badge variant="secondary" className="mt-2 gap-1">
                  <Briefcase className="h-3 w-3" />
                  Gestionnaire de Flotte
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {fleetProfile.description && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">{fleetProfile.description}</p>
          </div>
        )}

      </div>
    );
  };

  const renderCompanyProfile = () => {
    if (!companyProfile) return null;

    return (
      <div className="space-y-4">
        {/* Header */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={companyProfile.logo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {companyProfile.company_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg">{companyProfile.company_name}</p>
                {companyProfile.contact_name && (
                  <p className="text-sm text-muted-foreground">Contact: {companyProfile.contact_name}</p>
                )}
                
                <Badge variant="secondary" className="mt-2 gap-1">
                  <Building2 className="h-3 w-3" />
                  Entreprise
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        {companyProfile.address && (
          <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-muted-foreground">{companyProfile.address}</span>
          </div>
        )}

        {/* Info */}
        <div className="grid grid-cols-2 gap-2">
          {companyProfile.employee_count && (
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-lg font-bold">{companyProfile.employee_count}</p>
              <p className="text-xs text-muted-foreground">Employés</p>
            </div>
          )}
          {companyProfile.preferred_vehicle_types && companyProfile.preferred_vehicle_types.length > 0 && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Types de véhicules</p>
              <div className="flex flex-wrap gap-1">
                {companyProfile.preferred_vehicle_types.map((type, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px]">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20 text-primary">
              {getPartnerTypeIcon()}
            </div>
            <div>
              <DialogTitle className="text-lg">Profil du partenaire</DialogTitle>
              <DialogDescription>
                Consultez le profil de {partnerName || 'votre futur partenaire'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="pb-4">
              {partnerType === 'driver' && renderDriverProfile()}
              {partnerType === 'fleet' && renderFleetProfile()}
              {partnerType === 'company' && renderCompanyProfile()}

              {/* Le profil complet est affiché directement dans ce modal */}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <DialogFooter className="p-6 pt-4 bg-muted/20">
          <div className="flex flex-col gap-2 w-full">
            {viewOnly ? (
              <Button 
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full gap-2"
              >
                Fermer
              </Button>
            ) : (
              <>
                <Button 
                  onClick={onContinue}
                  className="w-full gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Continuer vers le contrat
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Vérifiez que ce partenaire correspond à vos attentes avant de signer
                </p>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
