import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Car, 
  Star, 
  Users,
  ArrowLeft,
  Loader2,
  Calendar,
  Shield,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoSolocab from "@/assets/logo-solocab.png";

interface FleetDriver {
  id: string;
  vehicle_model: string;
  vehicle_brand: string | null;
  vehicle_color: string | null;
  vehicle_photos: string[] | null;
  rating: number | null;
  total_rides: number | null;
  bio: string | null;
  services_offered: string[] | null;
  status: string;
  profile?: {
    full_name: string;
    profile_photo_url: string | null;
  };
}

interface FleetManagerPublic {
  id: string;
  company_name: string;
  contact_name: string;
  address: string;
  contact_phone: string | null;
  contact_email: string;
  show_drivers_in_public_storefront: boolean;
}

const FleetPublicProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [fleetManager, setFleetManager] = useState<FleetManagerPublic | null>(null);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);

  useEffect(() => {
    if (id) {
      fetchFleetData();
    }
  }, [id]);

  const fetchFleetData = async () => {
    try {
      // Fetch fleet manager
      const { data: fmData, error: fmError } = await supabase
        .from("fleet_managers")
        .select("id, company_name, contact_name, address, contact_phone, contact_email, show_drivers_in_public_storefront")
        .eq("id", id)
        .single();

      if (fmError) throw fmError;
      setFleetManager(fmData);

      // Fetch fleet drivers
      const { data: fmDrivers, error: driversError } = await supabase
        .from("fleet_manager_drivers")
        .select(`
          driver_id,
          driver:drivers(
            id,
            vehicle_model,
            vehicle_brand,
            vehicle_color,
            vehicle_photos,
            rating,
            total_rides,
            bio,
            services_offered,
            status,
            user_id
          )
        `)
        .eq("fleet_manager_id", id)
        .eq("status", "active");

      if (driversError) throw driversError;

      // Get driver profiles
      if (fmDrivers && fmDrivers.length > 0) {
        const driverUserIds = fmDrivers
          .filter((d: any) => d.driver && d.driver.status === "validated")
          .map((d: any) => d.driver.user_id);

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, profile_photo_url")
          .in("id", driverUserIds);

        const driversWithProfiles: FleetDriver[] = fmDrivers
          .filter((d: any) => d.driver && d.driver.status === "validated")
          .map((d: any) => ({
            ...d.driver,
            profile: profiles?.find((p) => p.id === d.driver.user_id),
          }));

        setDrivers(driversWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching fleet data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fleetManager) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Flotte non trouvée</p>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative container mx-auto px-4 py-12 md:py-20">
          {/* Back button */}
          <Link to="/chauffeurs" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux chauffeurs</span>
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Logo */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-3xl blur-xl opacity-30" />
              <div className="relative w-24 h-24 md:w-32 md:h-32 bg-card/80 backdrop-blur-xl rounded-3xl p-4 border border-border/50 shadow-2xl">
                <img src={logoSolocab} alt="SoloCab" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* Company Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold">{fleetManager.company_name}</h1>
                <Badge className="bg-success/20 text-success border-success/30">
                  <Shield className="w-3 h-3 mr-1" />
                  Vérifié
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <Building2 className="w-4 h-4" />
                <span>{fleetManager.contact_name}</span>
              </div>

              <div className="flex flex-wrap gap-4">
                {fleetManager.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{fleetManager.address}</span>
                  </div>
                )}
                {fleetManager.contact_phone && (
                  <a href={`tel:${fleetManager.contact_phone}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                    <Phone className="w-4 h-4 text-primary" />
                    <span>{fleetManager.contact_phone}</span>
                  </a>
                )}
                <a href={`mailto:${fleetManager.contact_email}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>{fleetManager.contact_email}</span>
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              <div className="text-center bg-card/50 backdrop-blur-xl rounded-2xl px-6 py-4 border border-border/30">
                <div className="text-3xl font-bold text-primary">{drivers.length}</div>
                <div className="text-sm text-muted-foreground">Chauffeurs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drivers Section */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
          <Car className="w-6 h-6 text-primary" />
          Nos Chauffeurs
        </h2>

        {drivers.length === 0 ? (
          <Card className="p-12 text-center">
            <Car className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">Aucun chauffeur disponible pour le moment</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((driver) => (
              <Link 
                key={driver.id} 
                to={`/chauffeur/${driver.id}`}
                className="group"
              >
                <Card className="overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 h-full">
                  {/* Driver Photo or Vehicle Photo */}
                  <div className="relative h-48 bg-gradient-to-br from-muted to-muted/50">
                    {driver.vehicle_photos && driver.vehicle_photos[0] ? (
                      <img 
                        src={driver.vehicle_photos[0]} 
                        alt="Véhicule" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-16 h-16 text-muted-foreground/30" />
                      </div>
                    )}
                    
                    {/* Driver Avatar Overlay */}
                    <div className="absolute bottom-4 left-4">
                      <Avatar className="w-16 h-16 border-4 border-background shadow-xl">
                        <AvatarImage src={driver.profile?.profile_photo_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-lg font-bold">
                          {(driver.profile?.full_name || "C")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Rating Badge */}
                    {driver.rating && (
                      <div className="absolute top-4 right-4 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                        <Star className="w-4 h-4 text-warning fill-warning" />
                        <span className="font-semibold">{driver.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <CardContent className="pt-4">
                    <h3 className="text-lg font-semibold mb-1">
                      {driver.profile?.full_name || "Chauffeur"}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Car className="w-4 h-4" />
                      <span>
                        {driver.vehicle_brand || ""} {driver.vehicle_model}
                        {driver.vehicle_color && ` • ${driver.vehicle_color}`}
                      </span>
                    </div>

                    {driver.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {driver.bio}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{driver.total_rides || 0} courses</span>
                      </div>
                      <Badge variant="outline" className="text-primary border-primary/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Disponible
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="inline-block p-8 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-primary/20">
            <h3 className="text-xl font-semibold mb-2">Besoin d'un transport ?</h3>
            <p className="text-muted-foreground mb-4">
              Réservez avec l'un de nos chauffeurs professionnels
            </p>
            <Link to={`/register-client-fleet?fm=${id}`}>
              <Button size="lg" className="gap-2">
                <Calendar className="w-5 h-5" />
                Devenir client
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FleetPublicProfile;
