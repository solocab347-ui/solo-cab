import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Star, Users, Loader2, CheckCircle, Building2, Truck, MapPin } from "lucide-react";
import { SelectedDriver } from "./CompanyCourseBookingWizard";

interface DriverSelectionStepProps {
  companyId: string;
  selectedDrivers: SelectedDriver[];
  setSelectedDrivers: React.Dispatch<React.SetStateAction<SelectedDriver[]>>;
  selectedFleetManagerId?: string | null;
  setSelectedFleetManagerId?: React.Dispatch<React.SetStateAction<string | null>>;
  selectionMode?: "drivers" | "fleet";
  setSelectionMode?: React.Dispatch<React.SetStateAction<"drivers" | "fleet">>;
}

interface FleetPartner {
  id: string;
  fleet_manager_id: string;
  company_name: string;
  logo_url: string | null;
  address: string | null;
  description: string | null;
  drivers_count?: number;
}

export function DriverSelectionStep({ 
  companyId, 
  selectedDrivers, 
  setSelectedDrivers,
  selectedFleetManagerId,
  setSelectedFleetManagerId,
  selectionMode = "drivers",
  setSelectionMode
}: DriverSelectionStepProps) {
  const [localMode, setLocalMode] = useState<"drivers" | "fleet">(selectionMode);
  
  const currentMode = setSelectionMode ? selectionMode : localMode;
  const handleModeChange = (mode: "drivers" | "fleet") => {
    if (setSelectionMode) {
      setSelectionMode(mode);
    } else {
      setLocalMode(mode);
    }
    // Clear selections when switching modes
    setSelectedDrivers([]);
    if (setSelectedFleetManagerId) {
      setSelectedFleetManagerId(null);
    }
  };

  // Fetch partner drivers
  const { data: partnerDrivers, isLoading: loadingDrivers } = useQuery({
    queryKey: ["company-partner-drivers-selection", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_driver_agreements")
        .select(`
          id,
          driver_id,
          driver:drivers(
            id,
            company_name,
            vehicle_brand,
            vehicle_model,
            vehicle_color,
            max_passengers,
            rating,
            total_rides,
            user_id,
            show_rating_partners
          )
        `)
        .eq("company_id", companyId)
        .eq("status", "accepted");

      if (error) throw error;

      // Fetch profiles
      const userIds = data?.map((a: any) => a.driver?.user_id).filter(Boolean) || [];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url")
        .in("id", userIds);

      return data?.map((agreement: any) => ({
        ...agreement,
        profile: profiles?.find((p: any) => p.id === agreement.driver?.user_id),
      })) || [];
    },
  });

  // Fetch fleet manager partners
  const { data: fleetPartners, isLoading: loadingFleets } = useQuery({
    queryKey: ["company-fleet-partners-selection", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_fleet_agreements")
        .select(`
          id,
          fleet_manager_id,
          fleet_manager:fleet_managers(
            id,
            company_name,
            logo_url,
            address,
            description,
            user_id
          )
        `)
        .eq("company_id", companyId)
        .eq("status", "accepted");

      if (error) throw error;

      // Count drivers for each fleet manager
      const fleetManagerIds = data?.map((a: any) => a.fleet_manager_id).filter(Boolean) || [];
      
      if (fleetManagerIds.length === 0) return [];

      // Get driver counts for each fleet manager
      const driversCountPromises = fleetManagerIds.map(async (fmId: string) => {
        const { count } = await supabase
          .from("fleet_manager_drivers")
          .select("*", { count: "exact", head: true })
          .eq("fleet_manager_id", fmId)
          .eq("status", "active");
        return { fmId, count: count || 0 };
      });

      const driversCounts = await Promise.all(driversCountPromises);
      const countsMap = Object.fromEntries(driversCounts.map(d => [d.fmId, d.count]));

      return data?.map((agreement: any) => ({
        id: agreement.id,
        fleet_manager_id: agreement.fleet_manager_id,
        company_name: agreement.fleet_manager?.company_name || "Gestionnaire",
        logo_url: agreement.fleet_manager?.logo_url,
        address: agreement.fleet_manager?.address,
        description: agreement.fleet_manager?.description,
        drivers_count: countsMap[agreement.fleet_manager_id] || 0,
      })) || [];
    },
  });

  const toggleDriver = (driver: any) => {
    const driverId = driver.driver_id;
    const isSelected = selectedDrivers.some(d => d.driverId === driverId);

    if (isSelected) {
      setSelectedDrivers(prev => prev.filter(d => d.driverId !== driverId));
    } else {
      setSelectedDrivers(prev => {
        if (prev.some(d => d.driverId === driverId)) return prev;
        return [...prev, {
          driverId,
          name: driver.profile?.full_name || "Chauffeur",
          companyName: driver.driver?.company_name,
          rating: driver.driver?.show_rating_partners !== false ? driver.driver?.rating : undefined,
          vehicleInfo: `${driver.driver?.vehicle_brand} ${driver.driver?.vehicle_model}`.trim() || undefined,
          photoUrl: driver.profile?.profile_photo_url,
        }];
      });
    }
  };

  const toggleAll = () => {
    if (selectedDrivers.length === partnerDrivers?.length) {
      setSelectedDrivers([]);
    } else {
      const uniqueDrivers = new Map<string, SelectedDriver>();
      partnerDrivers?.forEach((d: any) => {
        if (!uniqueDrivers.has(d.driver_id)) {
          uniqueDrivers.set(d.driver_id, {
            driverId: d.driver_id,
            name: d.profile?.full_name || "Chauffeur",
            companyName: d.driver?.company_name,
            rating: d.driver?.show_rating_partners !== false ? d.driver?.rating : undefined,
            vehicleInfo: `${d.driver?.vehicle_brand} ${d.driver?.vehicle_model}`.trim() || undefined,
            photoUrl: d.profile?.profile_photo_url,
          });
        }
      });
      setSelectedDrivers(Array.from(uniqueDrivers.values()));
    }
  };

  const selectFleetManager = (fleetManagerId: string) => {
    if (setSelectedFleetManagerId) {
      setSelectedFleetManagerId(
        selectedFleetManagerId === fleetManagerId ? null : fleetManagerId
      );
    }
  };

  const hasFleetPartners = fleetPartners && fleetPartners.length > 0;
  const hasDriverPartners = partnerDrivers && partnerDrivers.length > 0;

  if (loadingDrivers || loadingFleets) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If only one type of partner exists, show that directly
  if (!hasFleetPartners && !hasDriverPartners) {
    return (
      <div className="text-center py-12">
        <Car className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Aucun partenaire</p>
        <p className="text-sm text-muted-foreground mt-1">
          Vous devez d'abord établir un partenariat avec des chauffeurs ou gestionnaires de flotte
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode selector - only show if both types exist */}
      {hasFleetPartners && hasDriverPartners && (
        <Tabs value={currentMode} onValueChange={(v) => handleModeChange(v as "drivers" | "fleet")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="drivers" className="gap-2">
              <Car className="w-4 h-4" />
              Chauffeurs directs
            </TabsTrigger>
            <TabsTrigger value="fleet" className="gap-2">
              <Building2 className="w-4 h-4" />
              Gestionnaire de flotte
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Drivers selection */}
      {(currentMode === "drivers" || !hasFleetPartners) && hasDriverPartners && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Sélectionner les chauffeurs
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choisissez un ou plusieurs chauffeurs partenaires
              </p>
            </div>
            {partnerDrivers && partnerDrivers.length > 1 && (
              <button
                type="button"
                onClick={toggleAll}
                className="text-sm text-primary hover:underline"
              >
                {selectedDrivers.length === partnerDrivers.length ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            )}
          </div>

          <div className="grid gap-3">
            {partnerDrivers?.map((agreement: any) => {
              const isSelected = selectedDrivers.some(d => d.driverId === agreement.driver_id);
              
              return (
                <Card 
                  key={agreement.id}
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? "border-primary bg-primary/5 ring-1 ring-primary" 
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => toggleDriver(agreement)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleDriver(agreement)}
                        className="flex-shrink-0"
                      />
                      
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage src={agreement.profile?.profile_photo_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {agreement.profile?.full_name?.charAt(0) || "C"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold truncate">
                            {agreement.profile?.full_name || "Chauffeur"}
                          </h4>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {agreement.driver?.company_name || `${agreement.driver?.vehicle_brand} ${agreement.driver?.vehicle_model}`}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {agreement.driver?.show_rating_partners !== false && agreement.driver?.rating && (
                            <Badge variant="outline" className="text-xs">
                              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                              {agreement.driver.rating.toFixed(1)}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {agreement.driver?.max_passengers || 4} places
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedDrivers.length > 0 && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-primary">
                {selectedDrivers.length} chauffeur{selectedDrivers.length > 1 ? "s" : ""} sélectionné{selectedDrivers.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedDrivers.length > 1 
                  ? "Les devis seront générés pour chaque chauffeur. Vous pourrez ensuite choisir à qui envoyer."
                  : "Le devis sera généré pour ce chauffeur."
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Fleet manager selection */}
      {(currentMode === "fleet" || !hasDriverPartners) && hasFleetPartners && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Choisir un gestionnaire de flotte
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Le gestionnaire assignera un de ses chauffeurs à votre course
            </p>
          </div>

          <div className="grid gap-3">
            {fleetPartners?.map((partner: FleetPartner) => {
              const isSelected = selectedFleetManagerId === partner.fleet_manager_id;
              
              return (
                <Card 
                  key={partner.id}
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? "border-primary bg-primary/5 ring-1 ring-primary" 
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => selectFleetManager(partner.fleet_manager_id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 flex-shrink-0">
                        <AvatarImage src={partner.logo_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <Building2 className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold truncate">
                            {partner.company_name}
                          </h4>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        {partner.address && (
                          <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {partner.address}
                          </p>
                        )}
                        {partner.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {partner.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            <Truck className="w-3 h-3 mr-1" />
                            {partner.drivers_count} chauffeur{partner.drivers_count !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedFleetManagerId && (
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-sm font-medium text-blue-600">
                Gestionnaire de flotte sélectionné
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Votre demande sera envoyée directement au gestionnaire qui assignera un chauffeur disponible.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
