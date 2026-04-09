import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Car, MapPin, Star, Package, Wrench, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { getEquipmentLabel, getEquipmentIcon, getServiceLabel, getServiceIcon } from "@/lib/vehicleEquipmentDisplay";
import ShareButtons from "@/components/ShareButtons";

interface DriverProfile {
  id: string;
  company_name: string | null;
  vehicle_model: string;
  vehicle_plate: string | null;
  vehicle_color: string | null;
  vehicle_brand: string | null;
  vehicle_year: number | null;
  rating: number | null;
  total_rides: number | null;
  working_sectors: string[] | null;
  vehicle_equipment: string[] | null;
  services_offered: string[] | null;
  bio: string | null;
  service_description: string | null;
  max_passengers: number;
  public_profile_enabled: boolean | null;
  show_rating_public: boolean | null;
  show_phone: boolean | null;
  show_email: boolean | null;
  profiles: {
    full_name: string;
    profile_photo_url: string | null;
  };
}

const ClientDriverProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverProfile();
  }, [user]);

  const fetchDriverProfile = async () => {
    if (!user) return;

    try {
      const { data: client } = await supabase
        .from("clients")
        .select("driver_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!client?.driver_id) {
        toast.error("Aucun chauffeur associé");
        navigate("/client-dashboard");
        return;
      }

      const { data: driverData, error } = await supabase
        .from("drivers")
        .select(`
          id,
          company_name,
          vehicle_model,
          vehicle_plate,
          vehicle_color,
          vehicle_brand,
          vehicle_year,
          rating,
          total_rides,
          working_sectors,
          vehicle_equipment,
          services_offered,
          bio,
          service_description,
          max_passengers,
          public_profile_enabled,
          show_rating_public,
          show_phone,
          show_email,
          profiles:user_id(full_name, profile_photo_url)
        `)
        .eq("id", client.driver_id)
        .single();

      if (error) throw error;

      setDriver(driverData as any);
    } catch (error: any) {
      console.error("Error fetching driver profile:", error);
      toast.error("Erreur lors du chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  // Générer le lien de partage du chauffeur
  const getDriverShareUrl = (): string => {
    if (!driver) return window.location.href;
    
    // Si le chauffeur a un profil public, utiliser le lien public
    if (driver.public_profile_enabled) {
      return `${window.location.origin}/chauffeur/${driver.id}`;
    }
    
    // Sinon, utiliser le lien de la page actuelle (mais ce ne sera pas accessible publiquement)
    return `${window.location.origin}/chauffeur/${driver.id}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!driver) {
    return (
      <Card className="p-8 text-center">
        <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Profil du chauffeur non disponible</p>
      </Card>
    );
  }

  const driverName = driver.profiles?.full_name || "Votre chauffeur";

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate("/client-dashboard")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Retour au tableau de bord
      </Button>

      {/* Header Section */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          {driver.profiles?.profile_photo_url ? (
            <img
              src={driver.profiles.profile_photo_url}
              alt={driver.profiles.full_name}
              className="w-32 h-32 rounded-full object-cover"
            />
          ) : (
            <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center">
              <Car className="w-16 h-16 text-white" />
            </div>
          )}

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
              <h1 className="text-3xl font-bold">{driver.profiles?.full_name}</h1>
              <ShareButtons
                title={`Découvrez ${driverName}, mon chauffeur VTC`}
                message={`Je vous recommande ${driverName}, un excellent chauffeur VTC professionnel sur SoloCab !`}
                url={getDriverShareUrl()}
              />
            </div>
            {driver.company_name && driver.company_name.trim() && 
             !driver.company_name.toLowerCase().includes('compléter') &&
             !driver.company_name.toLowerCase().includes('attente') && (
              <p className="text-lg text-muted-foreground mb-4">{driver.company_name}</p>
            )}
            
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {driver.rating && (
                <Badge variant="outline" className="text-base px-3 py-1">
                  <Star className="w-4 h-4 mr-1 fill-amber-400 text-amber-400" />
                  {driver.rating.toFixed(1)}
                </Badge>
              )}
              {driver.total_rides && (
                <Badge variant="outline" className="text-base px-3 py-1">
                  <Car className="w-4 h-4 mr-1" />
                  {driver.total_rides} courses
                </Badge>
              )}
            </div>

            {driver.bio && driver.bio.trim() && 
             !driver.bio.toLowerCase().includes('compléter') &&
             !driver.bio.toLowerCase().includes('attente') && (
              <p className="mt-4 text-muted-foreground">{driver.bio}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Vehicle Information */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          Véhicule
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {driver.vehicle_model && driver.vehicle_model.trim() &&
           !driver.vehicle_model.toLowerCase().includes('compléter') &&
           !driver.vehicle_model.toLowerCase().includes('attente') && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Modèle</p>
              <p className="font-semibold">{driver.vehicle_model}</p>
            </div>
          )}
          {driver.vehicle_brand && driver.vehicle_brand.trim() &&
           !driver.vehicle_brand.toLowerCase().includes('compléter') &&
           !driver.vehicle_brand.toLowerCase().includes('attente') && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Marque</p>
              <p className="font-semibold">{driver.vehicle_brand}</p>
            </div>
          )}
          {driver.vehicle_plate && driver.vehicle_plate.trim() &&
           !driver.vehicle_plate.toLowerCase().includes('compléter') &&
           !driver.vehicle_plate.toLowerCase().includes('attente') && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Immatriculation</p>
              <p className="font-semibold">{driver.vehicle_plate}</p>
            </div>
          )}
          {driver.vehicle_color && driver.vehicle_color.trim() &&
           !driver.vehicle_color.toLowerCase().includes('compléter') &&
           !driver.vehicle_color.toLowerCase().includes('attente') && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Couleur</p>
              <p className="font-semibold">{driver.vehicle_color}</p>
            </div>
          )}
          {driver.vehicle_year && driver.vehicle_year > 1900 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Année</p>
              <p className="font-semibold">{driver.vehicle_year}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Capacité</p>
            <p className="font-semibold">{driver.max_passengers} passagers</p>
          </div>
        </div>
      </Card>

      {/* Equipment */}
      {driver.vehicle_equipment && driver.vehicle_equipment.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Équipements à bord
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {driver.vehicle_equipment.map((equipmentId) => (
              <div
                key={equipmentId}
                className="flex items-center gap-3 p-3 rounded-lg bg-accent/50"
              >
                <span className="text-2xl">{getEquipmentIcon(equipmentId)}</span>
                <span className="font-medium">{getEquipmentLabel(equipmentId)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Services Offered */}
      {driver.services_offered && driver.services_offered.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            Services proposés
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {driver.services_offered.map((serviceId) => (
              <div
                key={serviceId}
                className="flex items-start gap-3 p-4 rounded-lg bg-accent/50"
              >
                <span className="text-2xl flex-shrink-0">{getServiceIcon(serviceId)}</span>
                <div>
                  <p className="font-semibold mb-1">{getServiceLabel(serviceId)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Working Sectors */}
      {driver.working_sectors && driver.working_sectors.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Secteurs desservis
          </h2>
          <div className="flex flex-wrap gap-2">
            {driver.working_sectors.map((sector) => (
              <Badge key={sector} variant="secondary" className="text-sm px-3 py-1">
                {sector}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {driver.service_description && driver.service_description.trim() && 
       !driver.service_description.toLowerCase().includes('compléter') &&
       !driver.service_description.toLowerCase().includes('attente') && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Description des services</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {driver.service_description}
          </p>
        </Card>
      )}
    </div>
  );
};

export default ClientDriverProfile;