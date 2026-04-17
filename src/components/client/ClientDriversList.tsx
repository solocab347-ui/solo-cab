import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, MessageSquare, MapPin, Star, Calendar, Palette, Award, Briefcase, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { getServiceLabel } from "@/lib/serviceLabels";

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
  profiles: {
    full_name: string;
    profile_photo_url: string | null;
  };
}

const ClientDriversList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        profiles:user_id(full_name, profile_photo_url)
      `;

      // For exclusive clients, show only their assigned driver
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
        // For free clients, show all their drivers
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

  // Get driver display name based on visibility settings
  const getDriverDisplayName = (driver: Driver): { primary: string; secondary?: string } => {
    const fullName = driver.profiles?.full_name?.trim();
    const companyName = driver.company_name?.trim();
    const showDriverName = driver.display_driver_name === true;
    const showCompanyName = driver.display_company_name === true;

    // Both enabled - show driver name as primary, company as secondary
    if (showDriverName && showCompanyName && fullName && companyName) {
      return { primary: fullName, secondary: companyName };
    }
    // Only driver name
    if (showDriverName && fullName) {
      return { primary: fullName };
    }
    // Only company name
    if (showCompanyName && companyName) {
      return { primary: companyName };
    }
    // Fallback
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
              {/* Photo de profil */}
              {driver.profiles?.profile_photo_url ? (
                <img
                  src={driver.profiles.profile_photo_url}
                  alt={displayName.primary}
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-dark rounded-full flex items-center justify-center border-2 border-primary/20">
                  <span className="text-2xl font-bold text-primary-foreground">
                    {displayName.primary.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              <div className="flex-1">
                {/* Nom et note */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold">
                      {displayName.primary}
                    </h3>
                    {displayName.secondary && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {displayName.secondary}
                      </p>
                    )}
                  </div>
                  {driver.rating && driver.rating > 0 && driver.show_rating_public === true && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      {driver.rating.toFixed(1)}
                    </Badge>
                  )}
                </div>

                {/* Nombre de courses */}
                {driver.total_rides && driver.total_rides > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <Award className="w-4 h-4" />
                    <span>{driver.total_rides} courses effectuées</span>
                  </div>
                )}

                {/* Informations du véhicule */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Marque et modèle */}
                  {(driver.vehicle_brand || driver.vehicle_model) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {driver.vehicle_brand && `${driver.vehicle_brand} `}
                      {driver.vehicle_model}
                    </Badge>
                  )}
                  
                  {/* Couleur */}
                  {driver.vehicle_color && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Palette className="w-3 h-3" />
                      {driver.vehicle_color}
                    </Badge>
                  )}
                  
                  {/* Année */}
                  {driver.vehicle_year && driver.vehicle_year > 1900 && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {driver.vehicle_year}
                    </Badge>
                  )}
                </div>

                {/* Services proposés */}
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

                {/* Secteurs de travail */}
                {driver.working_sectors && driver.working_sectors.length > 0 && (
                  <div className="flex items-start gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      {driver.working_sectors.join(", ")}
                    </p>
                  </div>
                )}

                {/* Description du service */}
                {driver.service_description && (
                  <p className="text-sm text-muted-foreground italic mb-4">
                    "{driver.service_description}"
                  </p>
                )}

                {/* Boutons d'action */}
                <div className="flex gap-2">
                  <Button onClick={() => handleBooking(driver.id)}>
                    Réserver une course
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleMessage(driver.id)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default ClientDriversList;