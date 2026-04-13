import { useEffect, useState, useCallback } from "react";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
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
import { getDriverGlobalStats } from "@/hooks/useDriverGlobalStats";
import { PioneerBadge } from "@/components/ui/PioneerBadge";

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
  is_pioneer?: boolean;
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

  // Fonction de chargement réutilisable pour le realtime
  const loadDriver = useCallback(async () => {
    if (!id) return;
    
    try {
      console.log("🔍 Loading/Refreshing driver profile:", id);
      
      // Utilisation de la fonction RPC SECURITY DEFINER pour contourner les RLS
      // et permettre l'affichage de TOUS les profils publics
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_public_driver_profile_by_id', { driver_id_param: id });

      // La fonction RPC retourne un tableau, même pour un seul résultat
      const driverDataArray = Array.isArray(rpcData) ? rpcData : (rpcData ? [rpcData] : []);
      
      if (rpcError || driverDataArray.length === 0) {
        console.error("❌ Driver not found:", rpcError, "Data:", rpcData);
        toast.error("Chauffeur non trouvé ou profil non public");
        navigate("/chauffeurs");
        return;
      }

      const driverData = driverDataArray[0];

      console.log("✅ Driver data loaded");

      // Statistiques globales (incluant toutes les sources de courses)
      const globalStats = await getDriverGlobalStats(id);
      
      const totalRides = globalStats.totalRides;
      const averageRating = globalStats.averageRating;

      // Créer le profil complet à partir des données RPC
      const profile: DriverProfile = {
        id: driverData.id,
        user_id: driverData.user_id,
        company_name: driverData.company_name || "",
        vehicle_model: driverData.vehicle_model || "",
        vehicle_brand: driverData.vehicle_brand || null,
        vehicle_year: driverData.vehicle_year || null,
        vehicle_color: driverData.vehicle_color || null,
        service_description: driverData.service_description || "",
        bio: driverData.service_description || "",
        base_rate: driverData.base_rate || 0,
        per_km_rate: driverData.per_km_rate || 0,
        working_sectors: driverData.working_sectors || [],
        vehicle_equipment: driverData.vehicle_equipment || [],
        services_offered: driverData.services_offered || [],
        vehicle_photos: driverData.vehicle_photos || [],
        gallery_photos: driverData.gallery_photos || [],
        show_phone: driverData.show_phone ?? false,
        show_email: driverData.show_email ?? false,
        display_driver_name: driverData.display_driver_name ?? true,
        display_company_name: driverData.display_company_name ?? true,
        is_pioneer: driverData.is_pioneer || false,
        // Données du profil utilisateur
        full_name: driverData.profile_full_name || "Chauffeur",
        email: driverData.contact_email || driverData.profile_email || "",
        phone: driverData.contact_phone || driverData.profile_phone || "",
        contact_phone: driverData.contact_phone,
        contact_email: driverData.contact_email,
        profile_photo_url: driverData.profile_photo_url || null,
        // Statistiques calculées
        rating: averageRating,
        total_rides: totalRides,
        created_at: driverData.created_at || "",
      };

      console.log("✅ Profile complete");
      setDriver(profile);
      setLoading(false);
    } catch (error) {
      console.error("❌ Error loading driver:", error);
      toast.error("Erreur lors du chargement");
      navigate("/chauffeurs");
    }
  }, [id, navigate]);

  // Chargement initial
  useEffect(() => {
    if (!id) {
      navigate("/chauffeurs");
      return;
    }
    loadDriver();
  }, [id, navigate, loadDriver]);

  // Mises à jour instantanées via centralized subscription manager
  useEffect(() => {
    if (!id) return;

    const cleanupDriver = subscriptionManager.subscribe(
      `public-driver-profile-${id}`,
      { table: 'drivers', event: 'UPDATE', filter: `id=eq.${id}`, debounceMs: 500 },
      () => loadDriver()
    );

    const cleanupProfile = subscriptionManager.subscribe(
      `public-user-profile-for-driver-${id}`,
      { table: 'profiles', event: 'UPDATE', debounceMs: 500 },
      (payload) => {
        if (driver?.user_id && payload.new && (payload.new as any).id === driver.user_id) {
          loadDriver();
        }
      }
    );

    return () => {
      cleanupDriver();
      cleanupProfile();
    };
  }, [id, driver?.user_id, loadDriver]);

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

  // Déterminer le nom à afficher (masqué pour le public)
  const maskName = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return parts[0] || "Chauffeur";
    return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase()}.`;
  };
  const displayNameParts = [];
  if (driver.display_driver_name !== false || !driver.company_name) {
    displayNameParts.push(maskName(driver.full_name));
  }
  if (driver.display_company_name && driver.company_name) {
    displayNameParts.push(driver.company_name);
  }
  const displayName = displayNameParts.length > 0 ? displayNameParts.join(" - ") : maskName(driver.full_name);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header avec photo en grand */}
      <div className="relative">
        {/* Background sombre */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.1),transparent_50%)]" />
        
        {/* Navigation */}
        <header className="relative z-10 border-b border-white/10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="SoloCab" className="w-12 h-12 object-contain" />
            </Link>
            <NavigationHeader showBack={true} showHome={true} />
          </div>
        </header>

        {/* Profile Hero */}
        <div className="relative z-10 container mx-auto px-4 py-16 max-w-4xl">
          <div className="flex flex-col items-center text-center">
            {/* Photo de profil */}
            <div className="relative mb-6">
              <div className="w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden ring-4 ring-white/20 shadow-2xl bg-gradient-to-br from-primary to-amber-500">
                {driver.profile_photo_url ? (
                  <img
                    src={driver.profile_photo_url}
                    alt={driver.full_name}
                    className="w-full h-full object-cover object-[center_15%]"
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-6xl font-light">
                    {driver.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {driver.is_pioneer && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                  <PioneerBadge size="md" className="shadow-xl" />
                </div>
              )}
            </div>
            
            {/* Nom */}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {displayName}
            </h1>
            
            {/* Stats */}
            {driver.total_rides > 0 && (
              <div className="flex items-center gap-4 mb-6">
                {driver.rating > 0 && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    <span className="font-semibold text-white">{driver.rating.toFixed(1)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Award className="w-5 h-5 text-white/70" />
                  <span className="text-white">{driver.total_rides} courses</span>
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
                <div className="flex items-center gap-2 text-white/70 mb-8">
                  <Car className="w-5 h-5" />
                  <span>
                    {hasValidBrand && `${driver.vehicle_brand} `}
                    {hasValidModel && driver.vehicle_model}
                    {hasValidYear && ` (${driver.vehicle_year})`}
                    {hasValidColor && ` · ${driver.vehicle_color}`}
                  </span>
                </div>
              );
            })()}

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <Button
                onClick={() => {
                  // Navigate back to storefront with this driver pre-selected
                  // The storefront state is already persisted in sessionStorage
                  navigate(`/chauffeurs?select=${id}`);
                }}
                size="lg"
                className="flex-1 bg-gradient-to-r from-primary to-amber-500 hover:opacity-90 shadow-lg shadow-primary/30"
              >
                <Car className="w-5 h-5 mr-2" />
                Réserver
              </Button>
              
              <Button
                onClick={handleRegisterWithDriver}
                disabled={registering}
                variant="outline"
                size="lg"
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                {registering ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Inscription...</>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    S'inscrire avec ce chauffeur
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Transition */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Contenu */}
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        {/* Navigation rapide */}
        <div className="flex justify-center -mt-16 relative z-20">
          <Button
            onClick={() => navigate("/client-dashboard")}
            className="bg-card shadow-lg text-foreground hover:bg-accent px-8"
            variant="outline"
          >
            Mon espace client
          </Button>
        </div>

        {/* Description */}
        {driver.service_description && driver.service_description.trim() && 
         !driver.service_description.toLowerCase().includes('compléter') && (
          <Card className="p-6 md:p-8 border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-4">À propos</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {driver.service_description}
            </p>
          </Card>
        )}

        {/* Contact */}
        {((driver.show_phone && driver.phone) || (driver.show_email && driver.email)) && (
          <Card className="p-6 md:p-8 border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Contact
            </h2>
            <div className="space-y-3">
              {driver.show_phone && driver.phone && (
                <a href={`tel:${driver.phone}`} className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <Phone className="w-5 h-5 text-primary" />
                  <span className="font-medium">{driver.phone}</span>
                </a>
              )}
              {driver.show_email && driver.email && (
                <a href={`mailto:${driver.email}`} className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <Mail className="w-5 h-5 text-primary" />
                  <span className="font-medium break-all">{driver.email}</span>
                </a>
              )}
            </div>
          </Card>
        )}

        {/* Secteurs d'activité */}
        {driver.working_sectors && driver.working_sectors.length > 0 && (
          <Card className="p-6 md:p-8 border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
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
          <Card className="p-6 md:p-8 border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
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
          <Card className="p-6 md:p-8 border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-4">Galerie</h2>
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
          <Card className="p-6 md:p-8 border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-4">Services proposés</h2>
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
          <Card className="p-6 md:p-8 border-0 shadow-lg bg-card/80 backdrop-blur-sm">
            <h2 className="text-xl font-semibold mb-4">Équipements du véhicule</h2>
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
  );
};

export default ChauffeurProfile;
