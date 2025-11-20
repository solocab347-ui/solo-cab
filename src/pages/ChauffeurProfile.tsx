import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Star,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  Calendar,
  Award,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { VEHICLE_EQUIPMENT, DRIVER_SERVICES } from "@/lib/vehicleEquipment";

interface DriverProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_photo_url: string;
  vehicle_model: string;
  vehicle_brand: string;
  vehicle_year: number;
  vehicle_plate: string;
  vehicle_color: string;
  bio: string;
  rating: number;
  total_rides: number;
  working_sectors: string[];
  service_description: string;
  base_rate: number;
  per_km_rate: number;
  created_at: string;
  company_name: string;
  display_driver_name: boolean;
  display_company_name: boolean;
  vehicle_equipment: string[];
  services_offered: string[];
}

const ChauffeurProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDriverProfile(id);
    }
  }, [id]);

  const fetchDriverProfile = async (driverId: string) => {
    try {
      setLoading(true);

      // Get driver with profile
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select(
          `
          id,
          user_id,
          vehicle_model,
          vehicle_brand,
          vehicle_year,
          vehicle_plate,
          vehicle_color,
          bio,
          rating,
          total_rides,
          working_sectors,
          service_description,
          base_rate,
          per_km_rate,
          public_profile_enabled,
          created_at,
          company_name,
          display_driver_name,
          display_company_name,
          vehicle_equipment,
          services_offered,
          profiles (
            full_name,
            email,
            phone,
            profile_photo_url
          )
        `
        )
        .eq("id", driverId)
        .eq("public_profile_enabled", true)
        .eq("status", "validated")
        .single();

      if (driverError) throw driverError;
      if (!driverData) throw new Error("Chauffeur non trouvé");

      // Flatten the profile data
      setDriver({
        ...driverData,
        full_name: driverData.profiles.full_name,
        email: driverData.profiles.email,
        phone: driverData.profiles.phone,
        profile_photo_url: driverData.profiles.profile_photo_url,
      } as DriverProfile);
    } catch (error: any) {
      console.error("Error fetching driver profile:", error);
      toast.error("Chauffeur non trouvé ou profil non public");
      navigate("/chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWithDriver = async () => {
    if (!user) {
      toast.error("Vous devez d'abord créer un compte");
      navigate(`/register-client-driver?driver_id=${id}`);
      return;
    }

    setRegistering(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-client-driver", {
        body: { driver_id: id },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Inscription réussie ! Vous êtes maintenant client de ce chauffeur.");
      setTimeout(() => navigate("/client-dashboard"), 1500);
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error("Erreur lors de l'inscription");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-premium border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold bg-gradient-dark bg-clip-text text-transparent">
              SoloCab
            </span>
          </Link>
          <Link to="/chauffeurs">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux chauffeurs
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Driver Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <Card className="p-8 shadow-elegant">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-32 h-32 bg-gradient-dark rounded-full flex items-center justify-center text-primary-foreground text-4xl font-bold flex-shrink-0">
                  {driver.profile_photo_url ? (
                    <img
                      src={driver.profile_photo_url}
                      alt={driver.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    driver.full_name.charAt(0)
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">
                        {driver.display_driver_name && driver.full_name}
                        {driver.display_driver_name && driver.display_company_name && " - "}
                        {driver.display_company_name && driver.company_name}
                      </h1>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 text-premium fill-premium" />
                          <span className="font-semibold text-foreground">
                            {driver.rating.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Award className="w-5 h-5" />
                          <span>{driver.total_rides} courses</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <Car className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">
                      {driver.vehicle_brand && `${driver.vehicle_brand} `}
                      {driver.vehicle_model}
                      {driver.vehicle_year && ` (${driver.vehicle_year})`}
                      {driver.vehicle_color && ` · ${driver.vehicle_color}`}
                    </span>
                  </div>
                </div>
            </div>

            {user ? (
              <Button
                onClick={() => navigate(`/create-course?driver_id=${id}`)}
                size="lg"
                className="w-full bg-gradient-premium hover:opacity-90"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Réserver une course
              </Button>
            ) : (
              <Button
                onClick={handleRegisterWithDriver}
                disabled={registering}
                size="lg"
                className="w-full bg-gradient-premium hover:opacity-90"
              >
                {registering ? (
                  <>Inscription en cours...</>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    M'inscrire avec ce chauffeur
                  </>
                )}
              </Button>
            )}
          </Card>

            {/* About */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">À propos</h2>
              <p className="text-muted-foreground leading-relaxed">
                {driver.bio ||
                  driver.service_description ||
                  "Chauffeur professionnel à votre service."}
              </p>
            </Card>

            {/* Service Areas */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Secteurs de travail</h2>
              <div className="flex flex-wrap gap-2">
                {driver.working_sectors?.map((sector) => (
                  <Badge
                    key={sector}
                    variant="outline"
                    className="text-sm px-3 py-1"
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    {sector}
                  </Badge>
                ))}
                {(!driver.working_sectors ||
                  driver.working_sectors.length === 0) && (
                  <p className="text-muted-foreground">
                    Contactez le chauffeur pour plus d'informations
                  </p>
                )}
              </div>
            </Card>

            {/* Vehicle Equipment */}
            {driver.vehicle_equipment && driver.vehicle_equipment.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">🚗 Équipements disponibles</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {driver.vehicle_equipment.map((equipmentId) => {
                    const equipment = VEHICLE_EQUIPMENT.find((e) => e.id === equipmentId);
                    if (!equipment) return null;
                    return (
                      <div
                        key={equipmentId}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      >
                        <span className="text-lg">{equipment.icon}</span>
                        <span className="text-sm">{equipment.label}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Services Offered */}
            {driver.services_offered && driver.services_offered.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">💼 Services proposés</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {driver.services_offered.map((serviceId) => {
                    const service = DRIVER_SERVICES.find((s) => s.id === serviceId);
                    if (!service) return null;
                    return (
                      <div
                        key={serviceId}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <span className="text-xl">{service.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{service.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {service.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Booking Card */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <Card className="p-6 bg-gradient-dark text-primary-foreground shadow-elegant sticky top-24">
              <h3 className="text-xl font-bold mb-6">Tarifs</h3>
              <div className="space-y-4 mb-6">
                {driver.base_rate && (
                  <div className="flex items-center justify-between py-3 border-b border-primary-foreground/20">
                    <span className="opacity-80">Tarif de base</span>
                    <span className="text-2xl font-bold text-premium">
                      {driver.base_rate}€
                    </span>
                  </div>
                )}
                {driver.per_km_rate && (
                  <div className="flex items-center justify-between py-3 border-b border-primary-foreground/20">
                    <span className="opacity-80">Par kilomètre</span>
                    <span className="text-xl font-semibold text-premium">
                      {driver.per_km_rate}€
                    </span>
                  </div>
                )}
                {!driver.base_rate && !driver.per_km_rate && (
                  <p className="text-center opacity-80">
                    Tarifs personnalisés selon vos besoins
                  </p>
                )}
              </div>
              {user ? (
                <Link to={`/create-course?driver_id=${id}`}>
                  <Button className="w-full bg-gradient-premium hover:opacity-90 transition-opacity text-lg py-6">
                    <Calendar className="w-5 h-5 mr-2" />
                    Réserver une course
                  </Button>
                </Link>
              ) : (
                <>
                  <Button 
                    onClick={handleRegisterWithDriver}
                    disabled={registering}
                    className="w-full bg-gradient-premium hover:opacity-90 transition-opacity text-lg py-6"
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    {registering ? "Inscription..." : "M'inscrire avec ce chauffeur"}
                  </Button>
                  <p className="text-xs text-center opacity-60 mt-4">
                    Créez votre compte et inscrivez-vous avec ce chauffeur
                  </p>
                </>
              )}
            </Card>

            {/* Contact Card */}
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Contact</h3>
              <div className="space-y-3">
                {driver.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{driver.phone}</span>
                  </div>
                )}
                {driver.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{driver.email}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChauffeurProfile;
