import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Star,
  MapPin,
  Phone,
  Mail,
  Award,
  UserPlus,
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
import { useAuth } from "@/hooks/useAuth";
import { VEHICLE_EQUIPMENT, DRIVER_SERVICES } from "@/lib/vehicleEquipment";

interface DriverProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_photo_url: string | null;
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
  vehicle_photos: string[];
  gallery_photos: string[];
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

  // Supabase Realtime subscriptions optimisées pour éviter les bugs visuels
  useEffect(() => {
    if (!id) return;

    console.log("🔔 Configuration real-time optimisée pour:", id);
    
    // Canal unique pour éviter les duplications
    const channel = supabase
      .channel(`driver-profile-updates-${id}`, {
        config: {
          broadcast: { self: false }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `id=eq.${id}`
        },
        () => {
          console.log("🔄 Mise à jour driver");
          // Délai court pour éviter trop de re-renders
          setTimeout(() => fetchDriverProfile(id), 300);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          console.log("🔄 Mise à jour profile");
          setTimeout(() => fetchDriverProfile(id), 300);
        }
      )
      .subscribe();

    return () => {
      console.log("🔌 Nettoyage canal real-time");
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchDriverProfile = async (driverId: string) => {
    try {
      setLoading(true);

      console.log("🔍 Récupération du profil chauffeur:", driverId);

      // Récupération du chauffeur avec profil en une seule requête (comme dans Chauffeurs.tsx)
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
        .eq("id", driverId)
        .eq("public_profile_enabled", true)
        .eq("status", "validated")
        .maybeSingle();

      if (driverError) {
        console.error("❌ Erreur récupération chauffeur:", driverError);
        throw driverError;
      }
      
      if (!driverData) {
        console.error("❌ Aucune données chauffeur trouvées");
        throw new Error("Chauffeur non trouvé");
      }

      console.log("✅ Données chauffeur récupérées:", driverData);
      console.log("👤 Données profil imbriquées:", driverData.profiles);
      console.log("📷 URL photo de profil:", driverData.profiles?.profile_photo_url);

      // Calcul des statistiques réelles depuis les courses
      const { data: completedCourses, error: coursesError } = await supabase
        .from("courses")
        .select("client_rating")
        .or(`driver_id.eq.${driverId},driver_ids.cs.{${driverId}}`)
        .eq("status", "completed");

      let totalRides = 0;
      let averageRating = 0;

      if (!coursesError && completedCourses) {
        totalRides = completedCourses.length;
        const ratingsWithValues = completedCourses.filter(c => c.client_rating !== null);
        if (ratingsWithValues.length > 0) {
          const sum = ratingsWithValues.reduce((acc, c) => acc + (c.client_rating || 0), 0);
          averageRating = sum / ratingsWithValues.length;
        }
      }

      // Aplatir les données du profil avec toutes les informations
      const flattenedDriver: DriverProfile = {
        ...driverData,
        full_name: driverData.profiles?.full_name || "Chauffeur",
        email: driverData.profiles?.email || "",
        phone: driverData.profiles?.phone || "",
        profile_photo_url: driverData.profiles?.profile_photo_url || null,
        rating: averageRating,
        total_rides: totalRides,
      };

      console.log("✅ Profil chauffeur aplati avec photo:", flattenedDriver.profile_photo_url);
      setDriver(flattenedDriver);
    } catch (error: any) {
      console.error("❌ Erreur lors de la récupération du profil:", error);
      toast.error("Chauffeur non trouvé ou profil non public");
      navigate("/chauffeurs");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWithDriver = async () => {
    navigate(`/register-client-driver?driver_id=${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* En-tête */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              SoloCab
            </span>
          </Link>
          <NavigationHeader 
            showBack={true}
            showHome={true}
          />
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-6">
          {/* En-tête du profil */}
          <Card className="p-8 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
            <div className="flex flex-col items-center text-center gap-8">
              {/* Grande photo de profil centrée */}
              <div className="relative">
                <div className="w-56 h-56 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center text-white text-7xl font-bold shadow-2xl ring-4 ring-primary/20 overflow-hidden">
                  {driver.profile_photo_url ? (
                    <img
                      src={driver.profile_photo_url}
                      alt={driver.full_name}
                      className="w-full h-full object-cover object-[center_20%]"
                      onError={(e) => {
                        console.error("❌ Erreur chargement photo:", driver.profile_photo_url);
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent && !parent.querySelector('span')) {
                          const initial = document.createElement('span');
                          initial.className = 'text-7xl font-bold';
                          initial.textContent = driver.full_name.charAt(0).toUpperCase();
                          parent.appendChild(initial);
                        }
                      }}
                      onLoad={() => {
                        console.log("✅ Photo chargée avec succès!");
                      }}
                    />
                  ) : (
                    <span className="text-7xl">{driver.full_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {driver.total_rides > 0 && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary px-4 py-2 rounded-full shadow-lg">
                    <span className="text-sm font-bold text-primary-foreground">Chauffeur Professionnel</span>
                  </div>
                )}
              </div>
              
              {/* Informations du chauffeur centrées */}
              <div className="w-full space-y-4">
                <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                  {(() => {
                    const parts = [];
                    if (driver.display_driver_name !== false || !driver.company_name) {
                      parts.push(driver.full_name);
                    }
                    if (driver.display_company_name && driver.company_name) {
                      parts.push(driver.company_name);
                    }
                    return parts.length > 0 ? parts.join(" - ") : driver.full_name;
                  })()}
                </h1>
                
                <div className="flex items-center justify-center gap-8 text-muted-foreground">
                  {driver.total_rides > 0 && (
                    <>
                      <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-xl text-foreground">
                          {driver.rating > 0 ? driver.rating.toFixed(1) : "Nouveau"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                        <Award className="w-6 h-6 text-primary" />
                        <span className="font-semibold text-lg">{driver.total_rides} course{driver.total_rides > 1 ? "s" : ""}</span>
                      </div>
                    </>
                  )}
                </div>
                
                {(() => {
                  const hasValidBrand = driver.vehicle_brand && 
                    !driver.vehicle_brand.toLowerCase().includes('compléter');
                  const hasValidModel = driver.vehicle_model && 
                    !driver.vehicle_model.toLowerCase().includes('compléter');
                  const hasValidColor = driver.vehicle_color && 
                    !driver.vehicle_color.toLowerCase().includes('compléter');
                  
                  if (!hasValidBrand && !hasValidModel) return null;
                  
                  return (
                    <div className="flex items-center justify-center gap-3 bg-muted/30 px-6 py-3 rounded-full inline-flex mx-auto">
                      <Car className="w-6 h-6 text-primary" />
                      <span className="font-semibold text-lg">
                        {hasValidBrand && `${driver.vehicle_brand} `}
                        {hasValidModel && driver.vehicle_model}
                        {driver.vehicle_year && ` (${driver.vehicle_year})`}
                        {hasValidColor && ` · ${driver.vehicle_color}`}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Bouton d'appel à l'action */}
            <Button
              onClick={handleRegisterWithDriver}
              disabled={registering}
              size="lg"
              className="w-full mt-8 bg-gradient-to-r from-purple-600 to-blue-500 hover:opacity-90 text-white"
            >
              {registering ? (
                <>Inscription en cours...</>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  S'inscrire avec ce chauffeur
                </>
              )}
            </Button>
          </Card>

          {/* Carte d'informations de contact */}
          <Card className="p-8 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              Contact
            </h2>
            {(driver.phone || driver.email) ? (
              <div className="space-y-4">
                {driver.phone && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <Phone className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Téléphone</div>
                      <a href={`tel:${driver.phone}`} className="font-semibold text-lg hover:text-primary transition-colors">
                        {driver.phone}
                      </a>
                    </div>
                  </div>
                )}
                {driver.email && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Email</div>
                      <a href={`mailto:${driver.email}`} className="font-semibold text-lg hover:text-primary transition-colors break-all">
                        {driver.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Aucune information de contact publique
              </p>
            )}
          </Card>

          {/* Photos du véhicule */}
          {driver.vehicle_photos && driver.vehicle_photos.length > 0 && (
            <Card className="p-8 overflow-hidden shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                Photos du véhicule
              </h2>
              <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                <CarouselContent className="-ml-4">
                  {driver.vehicle_photos.map((photo, index) => (
                    <CarouselItem key={`vehicle-${index}`} className="pl-4 md:basis-1/2 lg:basis-1/3">
                      <div className="relative aspect-video rounded-xl overflow-hidden group shadow-lg">
                        <img 
                          src={photo} 
                          alt={`Véhicule ${index + 1}`} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="text-white text-sm font-medium">{index + 1}/{driver.vehicle_photos.length}</span>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="-left-12" />
                <CarouselNext className="-right-12" />
              </Carousel>
            </Card>
          )}

          {/* Galerie photos */}
          {driver.gallery_photos && driver.gallery_photos.length > 0 && (
            <Card className="p-8 overflow-hidden shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
              <h2 className="text-2xl font-bold mb-6">Galerie</h2>
              <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                <CarouselContent className="-ml-4">
                  {driver.gallery_photos.map((photo, index) => (
                    <CarouselItem key={`gallery-${index}`} className="pl-4 md:basis-1/2 lg:basis-1/3">
                      <div className="relative aspect-square rounded-xl overflow-hidden group shadow-lg">
                        <img 
                          src={photo} 
                          alt={`Galerie ${index + 1}`} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="-left-12" />
                <CarouselNext className="-right-12" />
              </Carousel>
            </Card>
          )}

          {/* Description du service */}
          {driver.service_description && !driver.service_description.toLowerCase().includes('compléter') && (
            <Card className="p-8 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
              <h2 className="text-2xl font-bold mb-4">À propos du service</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {driver.service_description}
              </p>
            </Card>
          )}

          {/* Bio */}
          {driver.bio && !driver.bio.toLowerCase().includes('compléter') && (
            <Card className="p-8 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
              <h2 className="text-2xl font-bold mb-4">Présentation</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {driver.bio}
              </p>
            </Card>
          )}

          {/* Secteurs d'activité */}
          {driver.working_sectors && driver.working_sectors.length > 0 && (
            <Card className="p-8 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                Secteurs d'activité
              </h2>
              <div className="flex flex-wrap gap-2">
                {driver.working_sectors.map((sector, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="px-4 py-2 text-base bg-primary/10 hover:bg-primary/20 text-primary border-0"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {sector}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Services proposés */}
          {driver.services_offered && driver.services_offered.length > 0 && (
            <Card className="p-8 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
              <h2 className="text-2xl font-bold mb-6">Services proposés</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {driver.services_offered.map((serviceKey, index) => {
                  const service = DRIVER_SERVICES.find(s => s.id === serviceKey);
                  if (!service) return null;
                  return (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
                        {service.icon}
                      </div>
                      <span className="font-medium">{service.label}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Équipements du véhicule */}
          {driver.vehicle_equipment && driver.vehicle_equipment.length > 0 && (
            <Card className="p-8 shadow-lg bg-gradient-to-br from-card via-card to-muted/20">
              <h2 className="text-2xl font-bold mb-6">Équipements du véhicule</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {driver.vehicle_equipment.map((equipKey, index) => {
                  const equipment = VEHICLE_EQUIPMENT.find(e => e.id === equipKey);
                  if (!equipment) return null;
                  return (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
                        {equipment.icon}
                      </div>
                      <span className="font-medium">{equipment.label}</span>
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
