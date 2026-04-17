import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Car, 
  MessageSquare, 
  MapPin, 
  Star, 
  Calendar, 
  Palette, 
  Award, 
  Briefcase, 
  Building2, 
  ExternalLink,
  Phone,
  Mail,
  CalendarPlus,
  Share2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { getServiceLabel } from "@/lib/serviceLabels";
import { useLocale } from "@/hooks/useLocale";
import ShareButtons from "@/components/ShareButtons";

interface Driver {
  id: string;
  company_name: string | null;
  vehicle_model: string;
  vehicle_brand: string | null;
  vehicle_color: string | null;
  vehicle_year: number | null;
  rating: number | null;
  total_rides: number | null;
  working_sectors: string[] | null;
  services_offered: string[] | null;
  service_description: string | null;
  display_driver_name: boolean;
  display_company_name: boolean;
  show_rating_public: boolean;
  show_phone: boolean;
  show_email: boolean;
  profiles: {
    full_name: string;
    profile_photo_url: string | null;
    phone: string | null;
    email: string | null;
  };
}

interface ClientDriversWithProfileProps {
  onViewProfile: () => void;
}

const ClientDriversWithProfile = ({ onViewProfile }: ClientDriversWithProfileProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientDrivers();
  }, [user]);

  const fetchClientDrivers = async () => {
    if (!user) return;

    try {
      const { data: client } = await supabase
        .from("clients")
        .select("driver_id, driver_ids, is_exclusive")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!client) return;

      const selectFields = `
        id,
        company_name,
        vehicle_model,
        vehicle_brand,
        vehicle_color,
        vehicle_year,
        rating,
        total_rides,
        working_sectors,
        services_offered,
        service_description,
        display_driver_name,
        display_company_name,
        show_rating_public,
        show_phone,
        show_email,
        profiles:user_id(full_name, profile_photo_url, phone, email)
      `;

      if (client.is_exclusive && client.driver_id) {
        const { data: driver } = await supabase
          .from("drivers")
          .select(selectFields)
          .eq("id", client.driver_id)
          .single();

        if (driver) {
          setDrivers([driver as any]);
        }
      } else {
        const driverIds = client.driver_ids || [];
        if (driverIds.length > 0) {
          const { data: driversData } = await supabase
            .from("drivers")
            .select(selectFields)
            .in("id", driverIds);

          if (driversData) {
            setDrivers(driversData as any);
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching drivers:", error);
      toast.error("Erreur lors du chargement des chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (driverId: string) => {
    navigate("/client-dashboard?tab=messages");
  };

  const handleBooking = (driverId: string) => {
    navigate(`/chauffeurs?select=${driverId}`);
  };

  const handleViewPublicProfile = (driverId: string) => {
    navigate(`/chauffeur/${driverId}`);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const getDriverDisplayName = (driver: Driver): { primary: string; secondary?: string } => {
    const fullName = driver.profiles?.full_name?.trim();
    const companyName = driver.company_name?.trim();
    const showDriverName = driver.display_driver_name === true;
    const showCompanyName = driver.display_company_name === true;

    if (showDriverName && showCompanyName && fullName && companyName) {
      return { primary: fullName, secondary: companyName };
    }
    if (showDriverName && fullName) {
      return { primary: fullName };
    }
    if (showCompanyName && companyName) {
      return { primary: companyName };
    }
    return { primary: "Chauffeur VTC" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Aucun chauffeur associé</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate("/chauffeurs")}
        >
          Découvrir des chauffeurs
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {drivers.map((driver) => {
        const displayName = getDriverDisplayName(driver);
        
        return (
          <Card key={driver.id} className="p-6 border-2 hover:shadow-elegant transition-all">
            <div className="flex items-start gap-4">
              {driver.profiles?.profile_photo_url ? (
                <img
                  src={driver.profiles.profile_photo_url}
                  alt={displayName.primary}
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleViewPublicProfile(driver.id)}
                />
              ) : (
                <div 
                  className="w-20 h-20 bg-gradient-dark rounded-full flex items-center justify-center border-2 border-primary/20 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleViewPublicProfile(driver.id)}
                >
                  <span className="text-2xl font-bold text-primary-foreground">
                    {displayName.primary.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 
                      className="text-lg font-bold cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleViewPublicProfile(driver.id)}
                    >
                      {displayName.primary}
                    </h3>
                    {displayName.secondary && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {displayName.secondary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {driver.rating && driver.rating > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        {driver.rating.toFixed(1)}
                      </Badge>
                    )}
                    <ShareButtons
                      title={`Découvrez ${displayName.primary} sur SoloCab`}
                      message={`Je vous recommande mon chauffeur VTC ${displayName.primary} sur SoloCab ! Un service de qualité, ponctuel et professionnel. 🚗✨`}
                      url={`${window.location.origin}/chauffeur/${driver.id}`}
                    />
                  </div>
                </div>

                {driver.total_rides && driver.total_rides > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <Award className="w-4 h-4" />
                    <span>{driver.total_rides} courses effectuées</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  {(driver.vehicle_brand || driver.vehicle_model) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {driver.vehicle_brand && `${driver.vehicle_brand} `}
                      {driver.vehicle_model}
                    </Badge>
                  )}
                  {driver.vehicle_color && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Palette className="w-3 h-3" />
                      {driver.vehicle_color}
                    </Badge>
                  )}
                  {driver.vehicle_year && driver.vehicle_year > 1900 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {driver.vehicle_year}
                    </Badge>
                  )}
                </div>

                {driver.services_offered && driver.services_offered.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Briefcase className="w-3 h-3" />
                      <span>Services</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {driver.services_offered.map((service) => (
                        <Badge key={service} variant="outline" className="text-xs bg-primary/5">
                          {getServiceLabel(service)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {driver.working_sectors && driver.working_sectors.length > 0 && (
                  <div className="flex items-start gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      {driver.working_sectors.join(", ")}
                    </p>
                  </div>
                )}

                {driver.service_description && (
                  <p className="text-sm text-muted-foreground italic mb-4">
                    "{driver.service_description}"
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handleBooking(driver.id)} className="gap-1">
                    <CalendarPlus className="w-4 h-4" />
                    Réserver
                  </Button>
                  <Button variant="outline" onClick={() => handleMessage(driver.id)} className="gap-1">
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </Button>
                  <Button variant="secondary" onClick={() => handleViewPublicProfile(driver.id)} className="gap-1">
                    <ExternalLink className="w-4 h-4" />
                    Voir profil
                  </Button>
                  {driver.show_phone && driver.profiles?.phone && (
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleCall(driver.profiles.phone!)}
                      title="Appeler"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                  )}
                  {driver.show_email && driver.profiles?.email && (
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleEmail(driver.profiles.email!)}
                      title="Envoyer un email"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default ClientDriversWithProfile;
