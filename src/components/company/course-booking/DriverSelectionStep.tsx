import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Car, Star, Users, Loader2, CheckCircle } from "lucide-react";
import { SelectedDriver } from "./CompanyCourseBookingWizard";

interface DriverSelectionStepProps {
  companyId: string;
  selectedDrivers: SelectedDriver[];
  setSelectedDrivers: React.Dispatch<React.SetStateAction<SelectedDriver[]>>;
}

export function DriverSelectionStep({ companyId, selectedDrivers, setSelectedDrivers }: DriverSelectionStepProps) {
  const { data: partnerDrivers, isLoading } = useQuery({
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

  const toggleDriver = (driver: any) => {
    const driverId = driver.driver_id;
    const isSelected = selectedDrivers.some(d => d.driverId === driverId);

    if (isSelected) {
      setSelectedDrivers(prev => prev.filter(d => d.driverId !== driverId));
    } else {
      // Prevent adding duplicate driver
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
      // Use a Map to ensure unique drivers by driverId
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {partnerDrivers && partnerDrivers.length > 0 ? (
        <div className="grid gap-3">
          {partnerDrivers.map((agreement: any) => {
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
      ) : (
        <div className="text-center py-12">
          <Car className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aucun chauffeur partenaire</p>
          <p className="text-sm text-muted-foreground mt-1">
            Vous devez d'abord établir un partenariat avec des chauffeurs
          </p>
        </div>
      )}

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
  );
}
