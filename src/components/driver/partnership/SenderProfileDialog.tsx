import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Phone, 
  Mail, 
  Building, 
  Star, 
  Car, 
  Calendar,
  Hash,
  MapPin,
  Loader2,
  History,
  CheckCircle2,
  XCircle,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SenderProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senderDriverId: string;
  currentDriverId: string;
}

interface SenderProfile {
  driver_id: string;
  user_id: string;
  full_name: string;
  profile_photo: string | null;
  card_photo: string | null;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  bio: string | null;
  sharing_number: number | null;
  rating: number | null;
  total_rides: number | null;
  city: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_year: number | null;
  services_offered: string[] | null;
  service_description: string | null;
  show_phone: boolean;
  show_email: boolean;
}

interface PartnershipHistory {
  id: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  commission_percentage: number | null;
  total_shared_courses: number;
  total_amount: number;
}

const serviceLabels: Record<string, string> = {
  airport: 'Aéroport',
  hourly: 'Mise à disposition',
  business: 'Affaires',
  events: 'Événements',
  shuttle: 'Navette',
  wedding: 'Mariage',
  medical: 'Médical',
  tourism: 'Tourisme',
  long_distance: 'Longue distance',
};

export function SenderProfileDialog({
  open,
  onOpenChange,
  senderDriverId,
  currentDriverId,
}: SenderProfileDialogProps) {
  const [profile, setProfile] = useState<SenderProfile | null>(null);
  const [partnership, setPartnership] = useState<PartnershipHistory | null>(null);
  const [sharedCoursesStats, setSharedCoursesStats] = useState<{ count: number; total: number }>({ count: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && senderDriverId) {
      loadSenderProfile();
    }
  }, [open, senderDriverId]);

  const loadSenderProfile = async () => {
    setLoading(true);
    try {
      // Load sender profile with ALL fields including visibility settings
      const { data: driverData } = await supabase
        .from('drivers')
        .select(`
          id,
          user_id,
          company_name,
          bio,
          sharing_number,
          rating,
          total_rides,
          vehicle_brand,
          vehicle_model,
          vehicle_color,
          vehicle_year,
          services_offered,
          service_description,
          card_photo_url,
          contact_phone,
          contact_email,
          show_phone_for_sharing,
          show_email,
          show_rating_for_sharing,
          show_rides_for_sharing
        `)
        .eq('id', senderDriverId)
        .single();

      if (driverData) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, profile_photo_url, phone, email')
          .eq('id', driverData.user_id)
          .single();

        const cityFromAddress = null; // GPS-only — no static address

        // Respecter les paramètres de visibilité
        const showPhone = driverData.show_phone_for_sharing || false;
        const showEmail = driverData.show_email || false;
        const showRating = driverData.show_rating_for_sharing || false;
        const showRides = driverData.show_rides_for_sharing || false;
        
        // Téléphone: contact_phone prioritaire, sinon profile.phone si autorisé
        const displayPhone = showPhone 
          ? (driverData.contact_phone || profileData?.phone) 
          : null;
        
        // Email: contact_email prioritaire, sinon profile.email si autorisé
        const displayEmail = showEmail 
          ? (driverData.contact_email || profileData?.email) 
          : null;

        setProfile({
          driver_id: driverData.id,
          user_id: driverData.user_id,
          full_name: profileData?.full_name || 'Chauffeur',
          profile_photo: profileData?.profile_photo_url,
          card_photo: driverData.card_photo_url,
          phone: displayPhone,
          email: displayEmail,
          company_name: driverData.company_name,
          bio: driverData.bio,
          sharing_number: driverData.sharing_number,
          rating: showRating ? driverData.rating : null,
          total_rides: showRides ? driverData.total_rides : null,
          city: cityFromAddress,
          vehicle_brand: driverData.vehicle_brand,
          vehicle_model: driverData.vehicle_model,
          vehicle_color: driverData.vehicle_color,
          vehicle_year: driverData.vehicle_year,
          services_offered: driverData.services_offered,
          service_description: driverData.service_description,
          show_phone: showPhone,
          show_email: showEmail,
        });
      }

      // Load partnership between these two drivers
      const { data: partnershipData } = await supabase
        .from('driver_partnerships')
        .select('*')
        .or(`and(driver_a_id.eq.${senderDriverId},driver_b_id.eq.${currentDriverId}),and(driver_a_id.eq.${currentDriverId},driver_b_id.eq.${senderDriverId})`)
        .eq('status', 'active')
        .single();

      if (partnershipData) {
        // Count shared courses between them
        const { count: sharedCount, data: sharedData } = await supabase
          .from('shared_courses')
          .select('course_amount', { count: 'exact' })
          .eq('partnership_id', partnershipData.id)
          .in('status', ['accepted', 'in_progress', 'completed']);

        const totalAmount = sharedData?.reduce((sum, c) => sum + (c.course_amount || 0), 0) || 0;

        setPartnership({
          id: partnershipData.id,
          status: partnershipData.status,
          created_at: partnershipData.created_at,
          accepted_at: partnershipData.accepted_at,
          commission_percentage: partnershipData.commission_percentage,
          total_shared_courses: sharedCount || 0,
          total_amount: totalAmount,
        });

        setSharedCoursesStats({
          count: sharedCount || 0,
          total: totalAmount,
        });
      } else {
        setPartnership(null);
        setSharedCoursesStats({ count: 0, total: 0 });
      }
    } catch (error) {
      console.error('Error loading sender profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSharingNumber = (num: number) => `SOLO-${String(num).padStart(6, '0')}`;
  
  // Photo à utiliser: card_photo prioritaire, sinon profile_photo
  const displayPhoto = profile?.card_photo || profile?.profile_photo;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profil du partenaire
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : profile ? (
          <div className="space-y-4">
            {/* Main profile info */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarImage src={displayPhoto || undefined} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {profile.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold">{profile.full_name}</h3>
                {profile.company_name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {profile.company_name}
                  </p>
                )}
                {profile.sharing_number && (
                  <Badge variant="outline" className="mt-1 font-mono text-xs">
                    <Hash className="h-3 w-3 mr-1" />
                    {formatSharingNumber(profile.sharing_number)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Location, rating & rides */}
            <div className="grid grid-cols-2 gap-3">
              {profile.city && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.city}</span>
                </div>
              )}
              {profile.rating && (
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span>{profile.rating.toFixed(1)} / 5</span>
                </div>
              )}
              {profile.total_rides !== null && profile.total_rides > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.total_rides} courses</span>
                </div>
              )}
            </div>

            {/* Contact info */}
            {(profile.phone || profile.email) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Contact</h4>
                <div className="grid gap-2">
                  {profile.phone && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="justify-start h-9"
                      onClick={() => window.open(`tel:${profile.phone}`, '_self')}
                    >
                      <Phone className="h-4 w-4 mr-2 text-green-600" />
                      {profile.phone}
                    </Button>
                  )}
                  {profile.email && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="justify-start h-9"
                      onClick={() => window.open(`mailto:${profile.email}`, '_blank')}
                    >
                      <Mail className="h-4 w-4 mr-2 text-blue-600" />
                      {profile.email}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Vehicle info - COMPLET */}
            {(profile.vehicle_brand || profile.vehicle_model || profile.vehicle_color) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Véhicule</h4>
                <div className="flex flex-wrap gap-2">
                  {(profile.vehicle_brand || profile.vehicle_model) && (
                    <Badge variant="secondary" className="text-xs">
                      <Car className="h-3 w-3 mr-1" />
                      {[profile.vehicle_brand, profile.vehicle_model].filter(Boolean).join(' ')}
                    </Badge>
                  )}
                  {profile.vehicle_color && (
                    <Badge variant="outline" className="text-xs">
                      {profile.vehicle_color}
                    </Badge>
                  )}
                  {profile.vehicle_year && (
                    <Badge variant="outline" className="text-xs">
                      {profile.vehicle_year}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Services offered */}
            {profile.services_offered && profile.services_offered.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Services proposés
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {profile.services_offered.map((service) => (
                    <Badge key={service} variant="secondary" className="text-xs">
                      {serviceLabels[service] || service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Bio / Service description */}
            {(profile.bio || profile.service_description) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">À propos</h4>
                <p className="text-sm text-muted-foreground">
                  {profile.service_description || profile.bio}
                </p>
              </div>
            )}

            <Separator />

            {/* Partnership history */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Historique du partenariat
              </h4>

              {partnership ? (
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Partenariat actif</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-700 border-0">
                        {partnership.commission_percentage}% commission
                      </Badge>
                    </div>
                    
                    {partnership.accepted_at && (
                      <p className="text-xs text-muted-foreground">
                        Depuis le {format(new Date(partnership.accepted_at), 'd MMMM yyyy', { locale: fr })}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="text-center p-2 bg-background rounded">
                        <p className="text-lg font-bold text-primary">{sharedCoursesStats.count}</p>
                        <p className="text-xs text-muted-foreground">Courses partagées</p>
                      </div>
                      <div className="text-center p-2 bg-background rounded">
                        <p className="text-lg font-bold text-primary">{sharedCoursesStats.total.toFixed(2)}€</p>
                        <p className="text-xs text-muted-foreground">Volume total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-amber-700">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">Pas encore de partenariat établi</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      C'est votre première collaboration avec ce chauffeur.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">
            Profil non trouvé
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}