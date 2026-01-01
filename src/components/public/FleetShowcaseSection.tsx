import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, 
  Users, 
  Star, 
  MapPin, 
  ChevronDown, 
  ChevronUp,
  Car,
  Shield,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoSolocab from "@/assets/logo-solocab.png";
import { getServiceLabel } from "@/lib/serviceLabels";

interface FleetManager {
  id: string;
  company_name: string;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  show_address: boolean;
  total_drivers: number | null;
  show_driver_count_public: boolean;
  services_offered: string[] | null;
}

interface FleetDriver {
  id: string;
  full_name: string;
  profile_photo_url: string | null;
  vehicle_model: string;
  vehicle_brand: string | null;
  rating: number | null;
}

interface FleetWithDrivers extends FleetManager {
  drivers: FleetDriver[];
}

const FleetShowcaseSection = () => {
  const [fleets, setFleets] = useState<FleetWithDrivers[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFleet, setExpandedFleet] = useState<string | null>(null);

  useEffect(() => {
    fetchFleets();
  }, []);

  const fetchFleets = async () => {
    try {
      // Récupérer les gestionnaires de flotte visibles avec leurs chauffeurs publics
      const { data: fleetManagers, error: fmError } = await supabase
        .from("fleet_managers")
        .select(`
          id,
          company_name,
          logo_url,
          description,
          address,
          show_address,
          total_drivers,
          show_driver_count_public,
          services_offered
        `)
        .eq("show_drivers_in_public_storefront", true)
        .eq("status", "active");

      if (fmError) throw fmError;

      // Pour chaque flotte, récupérer les chauffeurs visibles
      const fleetsWithDrivers: FleetWithDrivers[] = [];
      
      for (const fm of fleetManagers || []) {
        const { data: fmDrivers } = await supabase
          .from("fleet_manager_drivers")
          .select(`
            driver:drivers(
              id,
              vehicle_model,
              vehicle_brand,
              rating,
              user_id
            )
          `)
          .eq("fleet_manager_id", fm.id)
          .eq("status", "active")
          .eq("visible_in_storefront", true)
          .limit(5);

        // Récupérer les profils des chauffeurs
        const driverUserIds = fmDrivers
          ?.filter((d: any) => d.driver?.status !== 'pending')
          ?.map((d: any) => d.driver?.user_id)
          .filter(Boolean) || [];

        let profiles: any[] = [];
        if (driverUserIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, profile_photo_url")
            .in("id", driverUserIds);
          profiles = profilesData || [];
        }

        const drivers: FleetDriver[] = fmDrivers
          ?.filter((d: any) => d.driver)
          ?.map((d: any) => {
            const profile = profiles.find(p => p.id === d.driver.user_id);
            return {
              id: d.driver.id,
              full_name: profile?.full_name || "Chauffeur",
              profile_photo_url: profile?.profile_photo_url,
              vehicle_model: d.driver.vehicle_model,
              vehicle_brand: d.driver.vehicle_brand,
              rating: d.driver.rating
            };
          }) || [];

        // N'inclure que les flottes qui ont au moins un chauffeur visible
        if (drivers.length > 0) {
          fleetsWithDrivers.push({
            ...fm,
            drivers
          });
        }
      }

      setFleets(fleetsWithDrivers);
    } catch (error) {
      console.error("Error fetching fleets:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (fleets.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Flottes VTC</h2>
          <p className="text-sm text-muted-foreground">
            Réservez avec des gestionnaires de flotte et leurs équipes de chauffeurs
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {fleets.map((fleet) => (
          <Card key={fleet.id} className="overflow-hidden border-2 hover:border-primary/30 transition-colors">
            <CardContent className="p-0">
              {/* En-tête de la flotte */}
              <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shadow-md flex-shrink-0">
                    {fleet.logo_url ? (
                      <img src={fleet.logo_url} alt={fleet.company_name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <img src={logoSolocab} alt="SoloCab" className="w-full h-full object-contain p-2" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-bold">{fleet.company_name}</h3>
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        <Shield className="w-3 h-3 mr-1" />
                        Flotte vérifiée
                      </Badge>
                    </div>
                    
                    {fleet.show_address && fleet.address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{fleet.address}</span>
                      </div>
                    )}
                    
                    {fleet.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {fleet.description}
                      </p>
                    )}

                    {/* Services */}
                    {fleet.services_offered && fleet.services_offered.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {fleet.services_offered.slice(0, 4).map((service, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {getServiceLabel(service)}
                          </Badge>
                        ))}
                        {fleet.services_offered.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{fleet.services_offered.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {fleet.show_driver_count_public && (
                      <div className="text-center bg-white dark:bg-background rounded-lg px-4 py-2 shadow-sm">
                        <div className="text-2xl font-bold text-emerald-600">{fleet.total_drivers || fleet.drivers.length}</div>
                        <div className="text-xs text-muted-foreground">Chauffeurs</div>
                      </div>
                    )}
                    <Link to={`/fleet/${fleet.id}`}>
                      <Button size="sm" className="gap-1">
                        Voir la flotte
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Liste des chauffeurs (pliable) */}
              <div className="border-t">
                <button
                  onClick={() => setExpandedFleet(expandedFleet === fleet.id ? null : fleet.id)}
                  className="w-full px-6 py-3 flex items-center justify-between text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <span>Nos chauffeurs ({fleet.drivers.length})</span>
                  </div>
                  {expandedFleet === fleet.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {expandedFleet === fleet.id && (
                  <div className="px-6 pb-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {fleet.drivers.map((driver) => (
                        <div key={driver.id} className="text-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <Avatar className="w-12 h-12 mx-auto mb-2">
                            <AvatarImage src={driver.profile_photo_url || undefined} />
                            <AvatarFallback>
                              {driver.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium truncate">{driver.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {driver.vehicle_brand} {driver.vehicle_model}
                          </p>
                          {driver.rating && driver.rating > 0 && (
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-medium">{driver.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 text-center">
                      <Link to={`/fleet/${fleet.id}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          Voir tous les chauffeurs et réserver
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FleetShowcaseSection;
