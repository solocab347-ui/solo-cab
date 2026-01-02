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
import { Button } from '@/components/ui/button';
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
  Calendar,
  Building2,
  ExternalLink,
  CheckCircle,
  Hash,
  User,
  Briefcase,
} from 'lucide-react';

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

export function PartnerProfileDialog({
  open,
  onOpenChange,
  driverId,
}: PartnerProfileDialogProps) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && driverId) {
      loadProfile();
    }
  }, [open, driverId]);

  const loadProfile = async () => {
    if (!driverId) return;
    
    setLoading(true);
    try {
      // Charger les données du chauffeur
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select(`
          id,
          user_id,
          company_name,
          bio,
          rating,
          total_rides,
          working_sectors,
          services_offered,
          vehicle_equipment,
          card_photo_url,
          sharing_number,
          show_phone_for_sharing,
          show_email
        `)
        .eq('id', driverId)
        .single();

      if (driverError) throw driverError;

      // Charger le profil utilisateur
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, profile_photo_url, phone, email')
        .eq('id', driverData.user_id)
        .single();

      // Charger les véhicules
      const { data: vehiclesData } = await supabase
        .from('driver_vehicles')
        .select('id, brand, model, color, category, max_passengers, photos, equipment')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .order('is_favorite', { ascending: false });

      setProfile({
        ...driverData,
        profile: profileData,
        vehicles: vehiclesData || [],
      });
    } catch (error) {
      console.error('Error loading partner profile:', error);
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
                {/* Banner */}
                <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
                
                {/* Avatar et infos */}
                <div className="px-6 -mt-12">
                  <div className="flex items-end gap-4">
                    <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                      <AvatarImage src={profile.profile?.profile_photo_url || profile.card_photo_url || undefined} />
                      <AvatarFallback className="text-2xl bg-primary/10">
                        {profile.profile?.full_name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="pb-2">
                      <h2 className="text-xl font-bold">{profile.profile?.full_name || 'Chauffeur'}</h2>
                      {profile.company_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {profile.company_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges stats */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {profile.sharing_number && (
                      <Badge variant="outline" className="font-mono">
                        <Hash className="h-3 w-3 mr-1" />
                        {formatSharingNumber(profile.sharing_number)}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {profile.rating?.toFixed(1) || 'N/A'}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Car className="h-3 w-3" />
                      {profile.total_rides || 0} courses
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="px-6 mt-6 space-y-6">
                {/* Bio / Présentation */}
                {profile.bio && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Présentation
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {/* Contact */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact
                  </h3>
                  <div className="space-y-2">
                    {profile.show_phone_for_sharing && profile.profile?.phone ? (
                      <a 
                        href={`tel:${profile.profile.phone}`}
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        {profile.profile.phone}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Téléphone non visible
                      </p>
                    )}
                    {profile.show_email && profile.profile?.email ? (
                      <a 
                        href={`mailto:${profile.profile.email}`}
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Mail className="h-4 w-4" />
                        {profile.profile.email}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
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
                      <MapPin className="h-4 w-4" />
                      Secteurs d'activité
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.working_sectors.map((sector, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
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
                      <Briefcase className="h-4 w-4" />
                      Services proposés
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.services_offered.map((service, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {service}
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
                      <Car className="h-4 w-4" />
                      Véhicules ({profile.vehicles.length})
                    </h3>
                    <div className="space-y-3">
                      {profile.vehicles.map((vehicle) => (
                        <Card key={vehicle.id} className="p-3 bg-muted/30">
                          <div className="flex items-start gap-3">
                            {vehicle.photos && vehicle.photos.length > 0 ? (
                              <img 
                                src={vehicle.photos[0]} 
                                alt={`${vehicle.brand} ${vehicle.model}`}
                                className="w-20 h-14 object-cover rounded-md"
                              />
                            ) : (
                              <div className="w-20 h-14 bg-muted rounded-md flex items-center justify-center">
                                <Car className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">
                                {vehicle.brand} {vehicle.model}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {getCategoryLabel(vehicle.category)}
                                </Badge>
                                {vehicle.color && (
                                  <Badge variant="outline" className="text-xs">
                                    {vehicle.color}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  <Users className="h-3 w-3 mr-0.5" />
                                  {vehicle.max_passengers} places
                                </Badge>
                              </div>
                              {vehicle.equipment && vehicle.equipment.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {vehicle.equipment.slice(0, 4).map((eq, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs py-0">
                                      {eq}
                                    </Badge>
                                  ))}
                                  {vehicle.equipment.length > 4 && (
                                    <Badge variant="secondary" className="text-xs py-0">
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
                      <Package className="h-4 w-4" />
                      Équipements disponibles
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.vehicle_equipment.map((eq, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
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
