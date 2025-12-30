import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo-solocab.png";
import {
  Car,
  Star,
  MapPin,
  Phone,
  Mail,
  Award,
  UserPlus,
  Loader2,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VEHICLE_EQUIPMENT, DRIVER_SERVICES } from "@/lib/vehicleEquipment";

interface DriverProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  profile_photo_url: string | null;
  vehicle_model: string;
  vehicle_brand?: string | null;
  vehicle_year?: number | null;
  vehicle_color?: string | null;
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
  show_phone: boolean;
  show_email: boolean;
  vehicle_equipment: string[];
  services_offered: string[];
  vehicle_photos: string[];
  gallery_photos: string[];
}

const ChauffeurProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  // Scroll en haut de la page au chargement
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Chargement simple UNE SEULE FOIS au montage
  useEffect(() => {
    if (!id) {
      navigate("/chauffeurs");
      return;
    }

    let isMounted = true;

    const loadDriver = async () => {
      try {
        console.log("🔍 Loading driver profile:", id);
        
        // Récupération simple du chauffeur avec profil
        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select(`
            *,
            profiles!drivers_user_id_fkey (
              full_name,
              email,
              phone,
              profile_photo_url
            )
          `)
          .eq("id", id)
          .eq("public_profile_enabled", true)
          .eq("status", "validated")
          .maybeSingle();

        if (!isMounted) return;

        if (driverError || !driverData) {
          console.error("❌ Driver not found:", driverError);
          toast.error("Chauffeur non trouvé ou profil non public");
          navigate("/chauffeurs");
          return;
        }

        console.log("✅ Driver data loaded");

        // Statistiques des courses
        const { data: completedCourses } = await supabase
          .from("courses")
          .select("client_rating")
          .or(`driver_id.eq.${id},driver_ids.cs.{${id}}`)
          .eq("status", "completed");

        let totalRides = 0;
        let averageRating = 0;

        if (completedCourses && completedCourses.length > 0) {
          totalRides = completedCourses.length;
          const ratingsWithValues = completedCourses.filter(c => c.client_rating !== null);
          if (ratingsWithValues.length > 0) {
            const sum = ratingsWithValues.reduce((acc, c) => acc + (c.client_rating || 0), 0);
            averageRating = sum / ratingsWithValues.length;
          }
        }

        if (!isMounted) return;

        // Créer le profil complet
        const profile: DriverProfile = {
          ...driverData,
          full_name: driverData.profiles?.full_name || "Chauffeur",
          email: (driverData as any).contact_email || driverData.profiles?.email || "",
          phone: (driverData as any).contact_phone || driverData.profiles?.phone || "",
          contact_phone: (driverData as any).contact_phone,
          contact_email: (driverData as any).contact_email,
          profile_photo_url: driverData.profiles?.profile_photo_url || null,
          rating: averageRating,
          total_rides: totalRides,
          vehicle_brand: driverData.vehicle_brand || null,
          vehicle_year: driverData.vehicle_year || null,
          vehicle_color: driverData.vehicle_color || null,
        };

        console.log("✅ Profile complete");
        setDriver(profile);
      } catch (error) {
        console.error("❌ Error loading driver:", error);
        if (isMounted) {
          toast.error("Erreur lors du chargement");
          navigate("/chauffeurs");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDriver();

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  const handleRegisterWithDriver = () => {
    if (!id) return;
    navigate(`/register-client-driver?driver_id=${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  // Déterminer le nom à afficher
  const displayNameParts = [];
  if (driver.display_driver_name !== false || !driver.company_name) {
    displayNameParts.push(driver.full_name);
  }
  if (driver.display_company_name && driver.company_name) {
    displayNameParts.push(driver.company_name);
  }
  const displayName = displayNameParts.length > 0 ? displayNameParts.join(" - ") : driver.full_name;

  return (
    <div className="min-h-screen bg-background">
      {/* En-tête */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="SoloCab" className="w-12 h-12 object-contain" />
          </Link>
          <NavigationHeader showBack={true} showHome={true} />
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Boutons de navigation */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => navigate("/login")}
            variant="outline"
            className="flex-1"
          >
            Retour à la connexion
          </Button>
          <Button
            onClick={() => navigate("/client-dashboard")}
            className="flex-1 bg-gradient-premium"
          >
            Espace Client
          </Button>
        </div>

        <div className="space-y-6">
          {/* Profil principal */}
          <Card className="p-8 shadow-lg">
            <div className="flex flex-col items-center text-center gap-8">
              {/* Photo de profil */}
              <div className="relative">
                <div className="w-56 h-56 bg-gradient-premium rounded-full flex items-center justify-center text-white text-7xl font-bold shadow-2xl ring-4 ring-primary/20 overflow-hidden">
                  {driver.profile_photo_url ? (
                    <img
                      src={driver.profile_photo_url}
                      alt={driver.full_name}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent && !parent.querySelector('span')) {
                          const initial = document.createElement('span');
                          initial.className = 'text-7xl font-bold';
                          initial.textContent = driver.full_name.charAt(0).toUpperCase();
                          parent.appendChild(initial);
                        }
                      }}
                    />
                  ) : (
                    <span>{driver.full_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {driver.total_rides > 0 && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary px-4 py-2 rounded-full shadow-lg">
                    <span className="text-sm font-bold text-primary-foreground">Chauffeur Professionnel</span>
                  </div>
                )}
              </div>
              
              {/* Informations */}
              <div className="w-full space-y-4">
                <h1 className="text-4xl font-bold bg-gradient-dark bg-clip-text text-transparent">
                  {displayName}
                </h1>
                
                {driver.total_rides > 0 && (
                  <div className="flex items-center justify-center gap-8">
                    <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                      <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                      <span className="font-bold text-xl">
                        {driver.rating > 0 ? driver.rating.toFixed(1) : "Nouveau"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                      <Award className="w-6 h-6 text-primary" />
                      <span className="font-semibold text-lg">{driver.total_rides} course{driver.total_rides > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                )}
                
                {/* Véhicule */}
                {(() => {
                  const hasValidBrand = driver.vehicle_brand && !driver.vehicle_brand.toLowerCase().includes('compléter');
                  const hasValidModel = driver.vehicle_model && !driver.vehicle_model.toLowerCase().includes('compléter');
                  const hasValidColor = driver.vehicle_color && !driver.vehicle_color.toLowerCase().includes('compléter');
                  const hasValidYear = driver.vehicle_year && driver.vehicle_year > 1900;
                  
                  if (!hasValidBrand && !hasValidModel) return null;
                  
                  return (
                    <div className="flex items-center justify-center gap-3 bg-muted/30 px-6 py-3 rounded-full">
                      <Car className="w-6 h-6 text-primary" />
                      <span className="font-semibold text-lg">
                        {hasValidBrand && `${driver.vehicle_brand} `}
                        {hasValidModel && driver.vehicle_model}
                        {hasValidYear && ` (${driver.vehicle_year})`}
                        {hasValidColor && ` · ${driver.vehicle_color}`}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="w-full mt-8 space-y-3">
              <Button
                onClick={handleRegisterWithDriver}
                disabled={registering}
                size="lg"
                className="w-full bg-gradient-premium hover:opacity-90"
              >
                {registering ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Inscription en cours...</>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    S'inscrire avec ce chauffeur
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => navigate(`/reservation-rapide/${id}`)}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <Car className="w-5 h-5 mr-2" />
                Réserver sans s'inscrire
              </Button>
            </div>
          </Card>

          {/* Description */}
          {driver.service_description && driver.service_description.trim() && 
           !driver.service_description.toLowerCase().includes('compléter') && (
            <Card className="p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-4">À propos</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {driver.service_description}
              </p>
            </Card>
          )}

          {/* Contact */}
          {((driver.show_phone && driver.phone) || (driver.show_email && driver.email)) && (
            <Card className="p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Contact
              </h2>
              <div className="space-y-4">
                {driver.show_phone && driver.phone && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                    <Phone className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Téléphone</div>
                      <a href={`tel:${driver.phone}`} className="font-semibold text-lg hover:text-primary">
                        {driver.phone}
                      </a>
                    </div>
                  </div>
                )}
                {driver.show_email && driver.email && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                    <Mail className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Email</div>
                      <a href={`mailto:${driver.email}`} className="font-semibold text-lg hover:text-primary break-all">
                        {driver.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Secteurs d'activité */}
          {driver.working_sectors && driver.working_sectors.length > 0 && (
            <Card className="p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Secteurs d'activité
              </h2>
              <div className="flex flex-wrap gap-2">
                {driver.working_sectors.map((sector) => (
                  <Badge key={sector} variant="outline" className="text-sm">
                    {sector}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Photos du véhicule */}
          {driver.vehicle_photos && driver.vehicle_photos.length > 0 && (
            <Card className="p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Photos du véhicule
              </h2>
              <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                <CarouselContent className="-ml-4">
                  {driver.vehicle_photos.map((photo, index) => (
                    <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                      <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg">
                        <img 
                          src={photo} 
                          alt={`Véhicule ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </Card>
          )}

          {/* Galerie */}
          {driver.gallery_photos && driver.gallery_photos.length > 0 && (
            <Card className="p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Galerie</h2>
              <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                <CarouselContent className="-ml-4">
                  {driver.gallery_photos.map((photo, index) => (
                    <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                      <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg">
                        <img 
                          src={photo} 
                          alt={`Galerie ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </Card>
          )}

          {/* Services */}
          {driver.services_offered && driver.services_offered.length > 0 && (
            <Card className="p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Services proposés</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {driver.services_offered.map((service) => {
                  const serviceConfig = DRIVER_SERVICES.find(s => s.id === service);
                  return (
                    <div key={service} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl">{serviceConfig?.icon || "✓"}</div>
                      <span className="font-medium">{serviceConfig?.label || service}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Équipements */}
          {driver.vehicle_equipment && driver.vehicle_equipment.length > 0 && (
            <Card className="p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Équipements du véhicule</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {driver.vehicle_equipment.map((equipment) => {
                  const equipmentConfig = VEHICLE_EQUIPMENT.find(e => e.id === equipment);
                  return (
                    <div key={equipment} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl">{equipmentConfig?.icon || "✓"}</div>
                      <span className="font-medium">{equipmentConfig?.label || equipment}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChauffeurProfile;
