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
  ChevronLeft,
  ChevronRight,
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

  const fetchDriverProfile = async (driverId: string) => {
    try {
      setLoading(true);

      // Get driver with profile - utiliser maybeSingle au lieu de single pour éviter les erreurs
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select(
          `
          *,
          profiles!drivers_user_id_fkey (
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
        .maybeSingle();

      if (driverError) {
        console.error("Driver error:", driverError);
        throw driverError;
      }
      
      if (!driverData) {
        console.error("No driver data found");
        throw new Error("Chauffeur non trouvé");
      }

      console.log("Driver data loaded:", driverData);

      // Calculate real statistics from courses
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

      // Flatten the profile data avec toutes les informations
      const flattenedDriver = {
        ...driverData,
        full_name: driverData.profiles?.full_name || "Chauffeur",
        email: driverData.profiles?.email || "",
        phone: driverData.profiles?.phone || "",
        profile_photo_url: driverData.profiles?.profile_photo_url || null,
        rating: averageRating,
        total_rides: totalRides,
      } as DriverProfile;

      console.log("Flattened driver:", flattenedDriver);
      setDriver(flattenedDriver);
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
            <Card className="p-8 shadow-elegant bg-gradient-to-br from-card via-card to-muted/20">
              <div className="flex flex-col items-center text-center gap-8">
                {/* Large centered profile photo - 280px pour être vraiment visible */}
                <div className="relative">
                  <div className="w-72 h-72 bg-gradient-dark rounded-full flex items-center justify-center text-primary-foreground text-8xl font-bold shadow-2xl ring-4 ring-primary/20">
                    {driver.profile_photo_url ? (
                      <img
                        src={driver.profile_photo_url}
                        alt={driver.full_name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      driver.full_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {/* Badge de statut professionnel */}
                  {driver.total_rides > 0 && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary px-4 py-2 rounded-full shadow-lg">
                      <span className="text-sm font-bold text-primary-foreground">Chauffeur Professionnel</span>
                    </div>
                  )}
                </div>
                
                {/* Driver info centered */}
                <div className="w-full space-y-4">
                  <h1 className="text-4xl font-bold mb-3 bg-gradient-dark bg-clip-text text-transparent">
                    {(() => {
                      const parts = [];
                      // Toujours afficher le nom du chauffeur par défaut
                      if (driver.display_driver_name !== false || !driver.company_name) {
                        parts.push(driver.full_name);
                      }
                      // Ajouter le nom de l'entreprise si activé
                      if (driver.display_company_name && driver.company_name) {
                        parts.push(driver.company_name);
                      }
                      // Garantir qu'il y a toujours au moins le nom
                      return parts.length > 0 ? parts.join(" - ") : driver.full_name;
                    })()}
                  </h1>
                  
                  <div className="flex items-center justify-center gap-8 text-muted-foreground">
                    {driver.total_rides > 0 && (
                      <>
                        <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full">
                          <Star className="w-6 h-6 text-premium fill-premium" />
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
                  
                  {(driver.vehicle_brand || driver.vehicle_model) && (
                    <div className="flex items-center justify-center gap-3 bg-muted/30 px-6 py-3 rounded-full inline-flex mx-auto">
                      <Car className="w-6 h-6 text-primary" />
                      <span className="font-semibold text-lg">
                        {driver.vehicle_brand && `${driver.vehicle_brand} `}
                        {driver.vehicle_model}
                        {driver.vehicle_year && ` (${driver.vehicle_year})`}
                        {driver.vehicle_color && ` · ${driver.vehicle_color}`}
                      </span>
                    </div>
                  )}
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

            {/* Photos Gallery */}
            {(driver.vehicle_photos?.length > 0 || driver.gallery_photos?.length > 0) && (
              <Card className="p-8 overflow-hidden shadow-elegant bg-gradient-to-br from-card via-card to-muted/20">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  Galerie Photos
                </h2>
                <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                  <CarouselContent className="-ml-4">
                    {[...(driver.vehicle_photos || []), ...(driver.gallery_photos || [])].map((photo, index) => (
                      <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                        <div className="relative aspect-video rounded-xl overflow-hidden group shadow-lg">
                          <img 
                            src={photo} 
                            alt={`Photo ${index + 1}`} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="text-white text-sm font-medium">{index + 1}/{[...(driver.vehicle_photos || []), ...(driver.gallery_photos || [])].length}</span>
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-2 h-12 w-12 bg-background/80 backdrop-blur-sm hover:bg-background" />
                  <CarouselNext className="right-2 h-12 w-12 bg-background/80 backdrop-blur-sm hover:bg-background" />
                </Carousel>
              </Card>
            )}

            {/* About */}
            {(driver.bio || driver.service_description) && (
              <Card className="p-8 shadow-elegant bg-gradient-to-br from-card via-card to-muted/20">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  À propos
                </h2>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {driver.bio || driver.service_description}
                </p>
              </Card>
            )}

            {/* Service Areas */}
            {driver.working_sectors && driver.working_sectors.length > 0 && (
              <Card className="p-8 shadow-elegant bg-gradient-to-br from-card via-card to-muted/20">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  Secteurs de travail
                </h2>
                <div className="flex flex-wrap gap-3 justify-center">
                  {driver.working_sectors.map((sector) => (
                    <Badge
                      key={sector}
                      variant="outline"
                      className="text-base px-4 py-2 hover:bg-primary/10 transition-colors"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      {sector}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Vehicle Equipment */}
            {driver.vehicle_equipment && driver.vehicle_equipment.length > 0 && (
              <Card className="p-8 shadow-elegant bg-gradient-to-br from-card via-card to-muted/20">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  Équipements disponibles
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {driver.vehicle_equipment.map((equipmentId) => {
                    const equipment = VEHICLE_EQUIPMENT.find((e) => e.id === equipmentId);
                    if (!equipment) return null;
                    return (
                      <div
                        key={equipmentId}
                        className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <span className="text-2xl">{equipment.icon}</span>
                        <span className="font-medium">{equipment.label}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Services Offered */}
            {driver.services_offered && driver.services_offered.length > 0 && (
              <Card className="p-8 shadow-elegant bg-gradient-to-br from-card via-card to-muted/20">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  Services proposés
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {driver.services_offered.map((serviceId) => {
                    const service = DRIVER_SERVICES.find((s) => s.id === serviceId);
                    if (!service) return null;
                    return (
                      <div
                        key={serviceId}
                        className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <span className="text-3xl">{service.icon}</span>
                        <div>
                          <div className="font-semibold text-base mb-1">{service.label}</div>
                          <div className="text-sm text-muted-foreground">
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

          {/* Right Column - Contact Card */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="p-8 shadow-elegant sticky top-24">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                Contact
              </h3>
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
                {!driver.phone && !driver.email && (
                  <p className="text-center text-muted-foreground py-4">
                    Aucune information de contact publique disponible
                  </p>
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
