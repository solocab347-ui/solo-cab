import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Car,
  Star,
  MapPin,
  Phone,
  Mail,
  Award,
  UserPlus,
  Loader2,
  UserCheck,
  CalendarPlus,
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
import { getDriverGlobalStats } from "@/hooks/useDriverGlobalStats";
import { PioneerBadge } from "@/components/ui/PioneerBadge";
import { useAuth } from "@/hooks/useAuth";

interface DriverProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
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
  company_name: string;
  display_driver_name: boolean;
  display_company_name: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_rating_public: boolean;
  vehicle_equipment: string[];
  services_offered: string[];
  vehicle_photos: string[];
  gallery_photos: string[];
  is_pioneer?: boolean;
  // Note: vehicle_plate is deliberately excluded from public profile for security
}

interface DriverProfileDialogProps {
  driverId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isRegistered?: boolean;
}

export const DriverProfileDialog = ({
  driverId,
  open,
  onOpenChange,
  isRegistered = false,
}: DriverProfileDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(isRegistered);

  // Update alreadyRegistered when isRegistered prop changes
  useEffect(() => {
    setAlreadyRegistered(isRegistered);
  }, [isRegistered]);

  // Check if user is already registered with this driver
  useEffect(() => {
    if (!open || !driverId || !user || isRegistered) {
      return;
    }

    const checkRegistration = async () => {
      try {
        const { data: client } = await supabase
          .from("clients")
          .select("driver_id, driver_ids, is_exclusive")
          .eq("user_id", user.id)
          .maybeSingle();

        if (client) {
          const driverIds: string[] = [];
          if (client.driver_id) driverIds.push(client.driver_id);
          if (client.driver_ids && Array.isArray(client.driver_ids)) {
            client.driver_ids.forEach((id: string) => {
              if (!driverIds.includes(id)) driverIds.push(id);
            });
          }
          setAlreadyRegistered(driverIds.includes(driverId));
        }
      } catch (error) {
        console.error("Error checking registration:", error);
      }
    };

    checkRegistration();
  }, [open, driverId, user, isRegistered]);

  useEffect(() => {
    if (!open || !driverId) {
      setDriver(null);
      return;
    }

    let isMounted = true;

    const loadDriver = async () => {
      setLoading(true);
      try {
        console.log("🔍 Loading driver profile via RPC:", driverId);

        // Utilisation de la fonction RPC SECURITY DEFINER pour contourner les RLS
        // et permettre l'affichage de TOUS les profils publics (validés, pionniers, nouveaux inscrits 30j)
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_public_driver_profile_by_id', { driver_id_param: driverId });

        if (!isMounted) return;

        // La fonction RPC retourne un tableau
        const driverDataArray = Array.isArray(rpcData) ? rpcData : (rpcData ? [rpcData] : []);
        
        if (rpcError || driverDataArray.length === 0) {
          console.error("❌ Driver not found via RPC:", rpcError, "Data:", rpcData);
          toast.error("Chauffeur non trouvé ou profil non public");
          onOpenChange(false);
          return;
        }

        const driverData = driverDataArray[0];

        console.log("✅ Driver data loaded via RPC:", {
          profile_photo_url: driverData.profile_photo_url,
          is_pioneer: driverData.is_pioneer
        });

        // Statistiques globales (incluant toutes les sources de courses)
        const globalStats = await getDriverGlobalStats(driverId);
        
        const totalRides = globalStats.totalRides;
        const averageRating = globalStats.averageRating;

        if (!isMounted) return;

        // La RPC retourne directement profile_photo_url depuis le profil
        const profile: DriverProfile = {
          id: driverData.id,
          user_id: driverData.user_id,
          company_name: driverData.company_name || "",
          vehicle_model: driverData.vehicle_model || "",
          vehicle_brand: driverData.vehicle_brand || null,
          vehicle_year: driverData.vehicle_year || null,
          vehicle_color: driverData.vehicle_color || null,
          bio: driverData.service_description || "",
          service_description: driverData.service_description || "",
          working_sectors: driverData.working_sectors || [],
          vehicle_equipment: driverData.vehicle_equipment || [],
          services_offered: driverData.services_offered || [],
          vehicle_photos: driverData.vehicle_photos || [],
          gallery_photos: driverData.gallery_photos || [],
          show_phone: driverData.show_phone ?? false,
          show_email: driverData.show_email ?? false,
          show_rating_public: driverData.show_rating_public ?? true,
          display_driver_name: driverData.display_driver_name ?? true,
          display_company_name: driverData.display_company_name ?? true,
          // Données du profil utilisateur (viennent de la RPC)
          full_name: driverData.profile_full_name || "Chauffeur",
          email: driverData.contact_email || driverData.profile_email || "",
          phone: driverData.contact_phone || driverData.profile_phone || "",
          profile_photo_url: driverData.profile_photo_url || null,
          // Statistiques calculées
          rating: averageRating,
          total_rides: totalRides,
          is_pioneer: driverData.is_pioneer || false,
        };

        console.log("✅ Profile complete");
        setDriver(profile);
      } catch (error) {
        console.error("❌ Error loading driver:", error);
        if (isMounted) {
          toast.error("Erreur lors du chargement");
          onOpenChange(false);
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
  }, [driverId, open, onOpenChange]);

  const handleRegisterWithDriver = () => {
    if (!driverId) return;
    navigate(`/register-client-driver?driver_id=${driverId}`);
  };

  if (!driver && loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!driver) return null;

  const displayNameParts = [];
  if (driver.display_driver_name !== false || !driver.company_name) {
    displayNameParts.push(driver.full_name);
  }
  if (driver.display_company_name && driver.company_name) {
    displayNameParts.push(driver.company_name);
  }
  const displayName =
    displayNameParts.length > 0
      ? displayNameParts.join(" - ")
      : driver.full_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="sr-only">Profil du chauffeur</DialogTitle>
            </DialogHeader>

            {/* Profil principal */}
            <div className="flex flex-col items-center text-center gap-6">
              <div className="relative">
                <div className="w-40 h-40 bg-gradient-premium rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-2xl ring-4 ring-primary/20 overflow-hidden">
                  {driver.profile_photo_url && driver.profile_photo_url.trim() !== "" ? (
                    <img
                      src={driver.profile_photo_url}
                      alt={driver.full_name}
                      className="w-full h-full object-cover object-center"
                      loading="eager"
                      style={{ display: 'block' }}
                      onError={(e) => {
                        console.log("Photo failed to load:", driver.profile_photo_url);
                        const target = e.currentTarget;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          // Remove broken image and add fallback
                          const fallback = document.createElement("span");
                          fallback.className = "text-5xl font-bold text-white";
                          fallback.textContent = driver.full_name.charAt(0).toUpperCase();
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <span className="text-white">{driver.full_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                {driver.is_pioneer ? (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <PioneerBadge size="md" className="shadow-md" />
                  </div>
                ) : driver.total_rides > 0 ? (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary px-3 py-1 rounded-full shadow-lg">
                    <span className="text-xs font-bold text-primary-foreground">
                      Chauffeur Pro
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="w-full space-y-3">
                <h2 className="text-3xl font-bold bg-gradient-dark bg-clip-text text-transparent">
                  {displayName}
                </h2>

                {driver.total_rides > 0 && (
                  <div className="flex items-center justify-center gap-6">
                    {driver.rating > 0 && (
                      <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-full">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-lg">
                          {driver.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-full">
                      <Award className="w-5 h-5 text-primary" />
                      <span className="font-semibold">
                        {driver.total_rides} course{driver.total_rides > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                )}

                {(() => {
                  const hasValidBrand =
                    driver.vehicle_brand &&
                    driver.vehicle_brand.trim() &&
                    !driver.vehicle_brand.toLowerCase().includes("compléter") &&
                    !driver.vehicle_brand.toLowerCase().includes("attente");
                  const hasValidModel =
                    driver.vehicle_model &&
                    driver.vehicle_model.trim() &&
                    !driver.vehicle_model.toLowerCase().includes("compléter") &&
                    !driver.vehicle_model.toLowerCase().includes("attente");
                  const hasValidColor =
                    driver.vehicle_color &&
                    driver.vehicle_color.trim() &&
                    !driver.vehicle_color.toLowerCase().includes("compléter") &&
                    !driver.vehicle_color.toLowerCase().includes("attente");
                  const hasValidYear =
                    driver.vehicle_year && driver.vehicle_year > 1900;

                  if (!hasValidBrand && !hasValidModel) return null;

                  return (
                    <div className="flex items-center justify-center gap-2 bg-muted/30 px-4 py-2 rounded-full">
                      <Car className="w-5 h-5 text-primary" />
                      <span className="font-semibold">
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

            {/* Action Button - Different based on registration status */}
            {alreadyRegistered ? (
              <div className="space-y-3">
                <div className="w-full p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 text-center">
                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold mb-2">
                    <UserCheck className="w-5 h-5" />
                    Déjà inscrit avec ce chauffeur
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Vous êtes déjà client de ce chauffeur. Retrouvez-le dans votre espace "Mes chauffeurs".
                  </p>
                </div>
                <Button
                  onClick={() => navigate(`/create-course?driver_id=${driverId}`)}
                  size="lg"
                  className="w-full bg-gradient-premium hover:opacity-90"
                >
                  <CalendarPlus className="w-5 h-5 mr-2" />
                  Réserver une course
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  onClick={handleRegisterWithDriver}
                  disabled={registering}
                  size="lg"
                  className="flex-1 bg-gradient-premium hover:opacity-90"
                >
                  {registering ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Inscription...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      S'inscrire
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => navigate(`/reservation-rapide/${driverId}`)}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  <Car className="w-5 h-5 mr-2" />
                  Réserver sans s'inscrire
                </Button>
              </div>
            )}

            {/* Description */}
            {driver.service_description &&
              driver.service_description.trim() &&
              !driver.service_description.toLowerCase().includes("compléter") &&
              !driver.service_description.toLowerCase().includes("attente") && (
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">À propos</h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {driver.service_description}
                  </p>
                </div>
              )}

            {/* Contact */}
            {((driver.show_phone && driver.phone) ||
              (driver.show_email && driver.email)) && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Phone className="w-5 h-5 text-primary" />
                  Contact
                </h3>
                <div className="space-y-2">
                  {driver.show_phone && driver.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <Phone className="w-4 h-4 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Téléphone
                        </div>
                        <a
                          href={`tel:${driver.phone}`}
                          className="font-semibold hover:text-primary"
                        >
                          {driver.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {driver.show_email && driver.email && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <Mail className="w-4 h-4 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Email</div>
                        <a
                          href={`mailto:${driver.email}`}
                          className="font-semibold hover:text-primary break-all text-sm"
                        >
                          {driver.email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Secteurs */}
            {driver.working_sectors && driver.working_sectors.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Secteurs d'activité
                </h3>
                <div className="flex flex-wrap gap-2">
                  {driver.working_sectors.map((sector) => (
                    <Badge key={sector} variant="outline" className="text-sm">
                      {sector}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Photos véhicule */}
            {driver.vehicle_photos && driver.vehicle_photos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Car className="w-5 h-5 text-primary" />
                  Photos du véhicule
                </h3>
                <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                  <CarouselContent className="-ml-2">
                    {driver.vehicle_photos.map((photo, index) => (
                      <CarouselItem key={index} className="pl-2 md:basis-1/2">
                        <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg">
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
              </div>
            )}

            {/* Galerie */}
            {driver.gallery_photos && driver.gallery_photos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold">Galerie</h3>
                <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                  <CarouselContent className="-ml-2">
                    {driver.gallery_photos.map((photo, index) => (
                      <CarouselItem key={index} className="pl-2 md:basis-1/2">
                        <div className="relative aspect-square rounded-lg overflow-hidden shadow-lg">
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
              </div>
            )}

            {/* Services */}
            {driver.services_offered && driver.services_offered.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold">Services proposés</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {driver.services_offered.map((service) => {
                    const serviceConfig = DRIVER_SERVICES.find(
                      (s) => s.id === service
                    );
                    return (
                      <div
                        key={service}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      >
                        <div className="text-xl">{serviceConfig?.icon || "✓"}</div>
                        <span className="text-sm font-medium">
                          {serviceConfig?.label || service}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Équipements */}
            {driver.vehicle_equipment && driver.vehicle_equipment.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xl font-bold">Équipements du véhicule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {driver.vehicle_equipment.map((equipment) => {
                    const equipmentConfig = VEHICLE_EQUIPMENT.find(
                      (e) => e.id === equipment
                    );
                    return (
                      <div
                        key={equipment}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      >
                        <div className="text-xl">
                          {equipmentConfig?.icon || "✓"}
                        </div>
                        <span className="text-sm font-medium">
                          {equipmentConfig?.label || equipment}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
