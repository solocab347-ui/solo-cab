import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Car,
  Package,
  Users,
  Building2,
  CheckCircle,
  Hash,
  User,
  Briefcase,
  Plane,
  Clock,
  Route,
  Heart,
  Camera,
  Shield,
  Wifi,
  Snowflake,
  Baby,
  Newspaper,
  Droplet,
  Zap,
  Trophy,
} from 'lucide-react';
import { getServiceLabel, getServiceIcon } from '@/lib/serviceLabels';
import { getDriverGlobalStats, DriverGlobalStats } from '@/hooks/useDriverGlobalStats';

interface PartnerProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string | null;
}

interface DriverProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  bio: string | null;
  rating: number;
  total_rides: number;
  working_sectors: string[];
  services_offered: string[];
  vehicle_equipment: string[];
  card_photo_url: string | null;
  sharing_number: number | null;
  show_phone_for_sharing: boolean;
  show_email: boolean;
  show_rating_for_sharing: boolean;
  show_rides_for_sharing: boolean;
  contact_phone: string | null;
  contact_email: string | null;
  profile: {
    full_name: string;
    profile_photo_url: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  vehicles: {
    id: string;
    brand: string;
    model: string;
    color: string | null;
    category: string;
    max_passengers: number;
    photos: string[];
    equipment: string[];
  }[];
}

const equipmentIcons: Record<string, React.ReactNode> = {
  wifi: <Wifi className="h-3 w-3" />,
  climatisation: <Snowflake className="h-3 w-3" />,
  chargeur_usb: <Zap className="h-3 w-3" />,
  siege_bebe: <Baby className="h-3 w-3" />,
  eau_gratuite: <Droplet className="h-3 w-3" />,
  journaux: <Newspaper className="h-3 w-3" />,
};

export function PartnerProfileDialog({
  open,
  onOpenChange,
  driverId,
}: PartnerProfileDialogProps) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState<DriverGlobalStats | null>(null);

  useEffect(() => {
    if (open && driverId) {
      loadProfile();
      loadGlobalStats();
    }
  }, [open, driverId]);

  const loadGlobalStats = async () => {
    if (!driverId) return;
    try {
      const stats = await getDriverGlobalStats(driverId);
      setGlobalStats(stats);
    } catch (error) {
      console.error("Erreur chargement stats globales:", error);
    }
  };

  const loadProfile = async () => {
    if (!driverId) return;
    
    setLoading(true);
    try {
      // Utiliser la fonction RPC SECURITY DEFINER pour contourner RLS
      // et permettre l'accès aux profils des chauffeurs (validés, pionniers, période de grâce)
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_public_driver_profile_by_id', { driver_id_param: driverId });
      
      const driverDataArray = Array.isArray(rpcData) ? rpcData : (rpcData ? [rpcData] : []);
      
      if (rpcError || driverDataArray.length === 0) {
        console.error('Driver not found via RPC:', rpcError, 'Data:', rpcData);
        setProfile(null);
        return;
      }
      
      // Cast explicite car les types supabase ne sont pas encore à jour après migration
      const driverData = driverDataArray[0] as Record<string, unknown>;

      // Récupérer les véhicules séparément (pas de restriction RLS sur driver_vehicles pour le propriétaire)
      const { data: vehiclesData } = await supabase
        .from('driver_vehicles')
        .select('id, brand, model, color, category, max_passengers, photos, equipment')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .order('is_favorite', { ascending: false });

      // Mapper les données RPC vers le format DriverProfile
      setProfile({
        id: driverData.id as string,
        user_id: driverData.user_id as string,
        company_name: driverData.company_name as string | null,
        bio: driverData.service_description as string | null,
        rating: (driverData.rating as number) || 5,
        total_rides: (driverData.total_rides as number) || 0,
        working_sectors: (driverData.working_sectors as string[]) || [],
        services_offered: (driverData.services_offered as string[]) || [],
        vehicle_equipment: (driverData.vehicle_equipment as string[]) || [],
        card_photo_url: driverData.profile_photo_url as string | null,
        sharing_number: (driverData.sharing_number as number) || null,
        show_phone_for_sharing: (driverData.show_phone_for_sharing as boolean) ?? false,
        show_email: (driverData.show_email as boolean) ?? false,
        show_rating_for_sharing: (driverData.show_rating_for_sharing as boolean) ?? true,
        show_rides_for_sharing: (driverData.show_rides_for_sharing as boolean) ?? true,
        contact_phone: driverData.contact_phone as string | null,
        contact_email: driverData.contact_email as string | null,
        profile: {
          full_name: (driverData.profile_full_name as string) || 'Partenaire',
          profile_photo_url: driverData.profile_photo_url as string | null,
          phone: driverData.profile_phone as string | null,
          email: driverData.profile_email as string | null,
        },
        vehicles: vehiclesData || [],
      });
    } catch (error) {
      console.error('Error loading partner profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const formatSharingNumber = (num: number | null) => {
    if (!num) return null;
    return `SOLO-${String(num).padStart(6, '0')}`;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      berline: 'Berline',
      van: 'Van',
      premium: 'Premium',
      green: 'Écologique',
    };
    return labels[category] || category;
  };

  const getEquipmentIcon = (eq: string) => {
    const key = eq.toLowerCase().replace(/ /g, '_');
    return equipmentIcons[key] || <Package className="h-3 w-3" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : profile ? (
            <div className="pb-6">
              {/* Header avec photo et nom */}
              <div className="relative">
                <div className="h-24 bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
                
                <div className="px-4 sm:px-6 -mt-12">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-lg ring-2 ring-primary/20">
                      <AvatarImage src={profile.card_photo_url || profile.profile?.profile_photo_url || undefined} />
                      <AvatarFallback className="text-xl sm:text-2xl bg-primary/10 text-primary">
                        {profile.profile?.full_name?.charAt(0) || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="pb-2">
                      {/* Nom complet TOUJOURS visible en partenariat */}
                      <h2 className="text-lg sm:text-xl font-bold">{profile.profile?.full_name || 'Partenaire'}</h2>
                      {profile.company_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          {profile.company_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges stats - respecter la visibilité */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {profile.sharing_number && (
                      <Badge variant="outline" className="font-mono bg-background/50">
                        <Hash className="h-3 w-3 mr-1" />
                        {formatSharingNumber(profile.sharing_number)}
                      </Badge>
                    )}
                    {/* Rating visible uniquement si show_rating_for_sharing est true */}
                    {profile.show_rating_for_sharing && profile.rating !== null && (
                      <Badge className="gap-1 bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30">
                        <Star className="h-3 w-3 fill-current" />
                        {profile.rating?.toFixed(1) || 'N/A'}
                      </Badge>
                    )}
                    {/* Total rides global - visible uniquement si show_rides_for_sharing est true */}
                    {profile.show_rides_for_sharing && globalStats && (
                      <Badge className="gap-1 bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                        <Trophy className="h-3 w-3" />
                        {globalStats.totalRides} courses
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 sm:px-6 mt-6 space-y-5">
                {/* Bio / Présentation */}
                {profile.bio && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-foreground">
                      <User className="h-4 w-4 text-primary" />
                      Présentation
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      "{profile.bio}"
                    </p>
                  </div>
                )}

                {/* Contact */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Contact
                  </h3>
                  <div className="space-y-2">
                    {/* Téléphone: contact_phone prioritaire, sinon profile.phone */}
                    {profile.show_phone_for_sharing ? (
                      (profile.contact_phone || profile.profile?.phone) ? (
                        <a 
                          href={`tel:${profile.contact_phone || profile.profile?.phone}`}
                          className="flex items-center gap-2 text-sm text-primary hover:underline p-2 rounded-md hover:bg-primary/5 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          {profile.contact_phone || profile.profile?.phone}
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground flex items-center gap-2 p-2">
                          <Phone className="h-4 w-4" />
                          Téléphone non renseigné
                        </p>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground flex items-center gap-2 p-2">
                        <Phone className="h-4 w-4" />
                        Téléphone non visible
                      </p>
                    )}
                    {/* Email: contact_email prioritaire, sinon profile.email */}
                    {profile.show_email ? (
                      (profile.contact_email || profile.profile?.email) ? (
                        <a 
                          href={`mailto:${profile.contact_email || profile.profile?.email}`}
                          className="flex items-center gap-2 text-sm text-primary hover:underline p-2 rounded-md hover:bg-primary/5 transition-colors"
                        >
                          <Mail className="h-4 w-4" />
                          {profile.contact_email || profile.profile?.email}
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground flex items-center gap-2 p-2">
                          <Mail className="h-4 w-4" />
                          Email non renseigné
                        </p>
                      )
                    ) : (
                      <p className="text-sm text-muted-foreground flex items-center gap-2 p-2">
                        <Mail className="h-4 w-4" />
                        Email non visible
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Secteurs de travail */}
                {profile.working_sectors && profile.working_sectors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Secteurs d'activité
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.working_sectors.map((sector, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs py-1">
                          {sector}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Services offerts */}
                {profile.services_offered && profile.services_offered.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Services proposés
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.services_offered.map((service, idx) => (
                        <Badge 
                          key={idx} 
                          className="text-xs py-1 bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                        >
                          <span className="mr-1">{getServiceIcon(service)}</span>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {getServiceLabel(service)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Véhicules */}
                {profile.vehicles && profile.vehicles.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Car className="h-4 w-4 text-primary" />
                      Véhicules ({profile.vehicles.length})
                    </h3>
                    <div className="space-y-3">
                      {profile.vehicles.map((vehicle) => (
                        <Card key={vehicle.id} className="p-3 bg-muted/30 border-border/50">
                          <div className="flex items-start gap-3">
                            {vehicle.photos && vehicle.photos.length > 0 ? (
                              <img 
                                src={vehicle.photos[0]} 
                                alt={`${vehicle.brand} ${vehicle.model}`}
                                className="w-20 h-14 sm:w-24 sm:h-16 object-cover rounded-md border border-border/50"
                              />
                            ) : (
                              <div className="w-20 h-14 sm:w-24 sm:h-16 bg-muted rounded-md flex items-center justify-center border border-border/50">
                                <Car className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">
                                {vehicle.brand} {vehicle.model}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <Badge variant="outline" className="text-xs py-0.5">
                                  {getCategoryLabel(vehicle.category)}
                                </Badge>
                                {vehicle.color && (
                                  <Badge variant="outline" className="text-xs py-0.5">
                                    {vehicle.color}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs py-0.5">
                                  <Users className="h-3 w-3 mr-0.5" />
                                  {vehicle.max_passengers} places
                                </Badge>
                              </div>
                              {vehicle.equipment && vehicle.equipment.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {vehicle.equipment.slice(0, 4).map((eq, idx) => (
                                    <Badge key={idx} className="text-xs py-0.5 bg-primary/10 text-primary border-primary/20 gap-1">
                                      {getEquipmentIcon(eq)}
                                      {eq}
                                    </Badge>
                                  ))}
                                  {vehicle.equipment.length > 4 && (
                                    <Badge className="text-xs py-0.5 bg-muted text-muted-foreground">
                                      +{vehicle.equipment.length - 4}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Équipements globaux */}
                {profile.vehicle_equipment && profile.vehicle_equipment.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      Équipements disponibles
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.vehicle_equipment.map((eq, idx) => (
                        <Badge key={idx} className="text-xs py-1 bg-primary/10 text-primary border-primary/20 gap-1">
                          {getEquipmentIcon(eq)}
                          {eq}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-muted-foreground">Profil non trouvé</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
