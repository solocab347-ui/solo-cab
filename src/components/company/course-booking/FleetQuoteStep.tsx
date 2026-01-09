import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, MapPin, Euro, Loader2, Clock, Route, 
  Calendar, Users, FileText, AlertCircle, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CourseFormData } from "./CompanyCourseBookingWizard";

interface FleetQuoteStepProps {
  companyId: string;
  formData: CourseFormData;
  fleetManagerId: string;
  generatedPrice: number | null;
  setGeneratedPrice: React.Dispatch<React.SetStateAction<number | null>>;
  priceDetails: PriceDetails | null;
  setPriceDetails: React.Dispatch<React.SetStateAction<PriceDetails | null>>;
}

export interface PriceDetails {
  base_price: number;
  distance_price: number;
  time_price: number;
  surcharge_evening: number;
  surcharge_weekend: number;
  subtotal: number;
  tva_amount: number;
  total_price: number;
  distance_km: number;
  duration_minutes: number;
  pricing_source?: string;
}

// Helper function to extract city from address
function extractCityFromAddress(address: string): string | null {
  if (!address) return null;
  
  // Try to find postal code pattern and extract city after it
  const postalMatch = address.match(/\b(\d{5})\s+([A-Za-zÀ-ÿ\s-]+)/);
  if (postalMatch) {
    return postalMatch[2].trim().split(',')[0].trim();
  }
  
  // Fallback: get the second-to-last part (often the city)
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const cityPart = parts[parts.length - 2];
    // Remove postal code if present
    return cityPart.replace(/\d{5}/, '').trim();
  }
  
  return null;
}

export function FleetQuoteStep({ 
  companyId, 
  formData, 
  fleetManagerId,
  generatedPrice,
  setGeneratedPrice,
  priceDetails,
  setPriceDetails
}: FleetQuoteStepProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch fleet manager info
  const { data: fleetManager, isLoading: loadingFleet } = useQuery({
    queryKey: ["fleet-manager-quote-info", fleetManagerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fleet_managers")
        .select(`
          id,
          company_name,
          logo_url,
          address,
          description,
          user_id
        `)
        .eq("id", fleetManagerId)
        .single();

      if (error) throw error;

      // Get driver count (internal + partners)
      const { count: internalCount } = await supabase
        .from("fleet_manager_drivers")
        .select("*", { count: "exact", head: true })
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "active");

      const { count: partnerCount } = await supabase
        .from("fleet_driver_partnerships")
        .select("*", { count: "exact", head: true })
        .eq("fleet_manager_id", fleetManagerId)
        .eq("status", "accepted");

      return { ...data, drivers_count: (internalCount || 0) + (partnerCount || 0) };
    },
  });

  // Calculate price on mount
  useEffect(() => {
    if (generatedPrice === null && fleetManagerId && formData.pickupAddress && formData.destinationAddress) {
      calculatePrice();
    }
  }, [fleetManagerId, formData.pickupAddress, formData.destinationAddress]);

  const calculatePrice = async () => {
    setIsCalculating(true);
    setError(null);

    try {
      // Step 1: Calculate distance using edge function or estimate
      let distanceKm = 10; // Default
      let durationMinutes = 20; // Default

      if (formData.pickupCoordinates && formData.destinationCoordinates) {
        // Calculate using Haversine formula (rough estimate)
        const R = 6371;
        const dLat = (formData.destinationCoordinates.latitude - formData.pickupCoordinates.latitude) * Math.PI / 180;
        const dLon = (formData.destinationCoordinates.longitude - formData.pickupCoordinates.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(formData.pickupCoordinates.latitude * Math.PI / 180) * 
                  Math.cos(formData.destinationCoordinates.latitude * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const straightLineDistance = R * c;
        
        // Multiply by 1.3 to account for road routing
        distanceKm = Math.round(straightLineDistance * 1.3 * 10) / 10;
        durationMinutes = Math.round(distanceKm * 2); // Rough estimate: 2 min per km
      }

      // Extract cities from addresses
      const pickupCity = extractCityFromAddress(formData.pickupAddress);
      const destinationCity = extractCityFromAddress(formData.destinationAddress);

      // Step 2: Calculate price using RPC
      const { data: priceData, error: priceError } = await (supabase.rpc as any)("calculate_fleet_course_price", {
        p_fleet_manager_id: fleetManagerId,
        p_distance_km: distanceKm,
        p_duration_minutes: durationMinutes,
        p_use_hourly_rate: false,
        p_scheduled_date: formData.scheduledDate || null,
        p_pickup_city: pickupCity,
        p_destination_city: destinationCity
      });

      if (priceError) {
        console.error("Price calculation error:", priceError);
        setError("Impossible de calculer le prix. Veuillez réessayer.");
        return;
      }

      if (!priceData || priceData.length === 0) {
        setError("Le gestionnaire n'a pas configuré ses tarifs.");
        return;
      }

      const calculatedPrice = priceData[0];
      
      setPriceDetails({
        ...calculatedPrice,
        distance_km: distanceKm,
        duration_minutes: durationMinutes
      });
      
      setGeneratedPrice(calculatedPrice.total_price);

    } catch (err) {
      console.error("Error calculating price:", err);
      setError("Erreur lors du calcul du prix");
    } finally {
      setIsCalculating(false);
    }
  };

  if (loadingFleet || isCalculating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium">
            {loadingFleet ? "Chargement..." : "Calcul du devis en cours..."}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Estimation du prix basée sur les tarifs du gestionnaire
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-red-600">Erreur</h3>
          <p className="text-muted-foreground mt-2">{error}</p>
        </div>
        <Button onClick={calculatePrice} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Devis automatique
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Prix calculé selon les tarifs du gestionnaire
        </p>
      </div>

      {/* Fleet Manager Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={fleetManager?.logo_url || undefined} />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                <Building2 className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-semibold text-lg">{fleetManager?.company_name}</h4>
              {fleetManager?.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {fleetManager.address}
                </p>
              )}
              <Badge variant="secondary" className="mt-1">
                {fleetManager?.drivers_count} chauffeur{fleetManager?.drivers_count !== 1 ? "s" : ""} disponibles
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Summary */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Détails du trajet</h4>
          
          <div className="space-y-2">
            <div className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
              <span className="flex-1">{formData.pickupAddress}</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <span className="flex-1">{formData.destinationAddress}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Route className="w-4 h-4" />
              <span>{priceDetails?.distance_km?.toFixed(1) || "~"} km</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>~{priceDetails?.duration_minutes || "~"} min</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {formData.scheduledDate 
                  ? format(new Date(formData.scheduledDate), "d MMM yyyy 'à' HH:mm", { locale: fr })
                  : "Non défini"
                }
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{formData.passengersCount} passager{parseInt(formData.passengersCount) > 1 ? "s" : ""}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Card */}
      {priceDetails && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Euro className="w-4 h-4 text-primary" />
              Détail du prix
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix de base</span>
                <span>{priceDetails.base_price.toFixed(2)} €</span>
              </div>
              {priceDetails.distance_price > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance ({priceDetails.distance_km.toFixed(1)} km)</span>
                  <span>{priceDetails.distance_price.toFixed(2)} €</span>
                </div>
              )}
              {priceDetails.time_price > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Temps ({priceDetails.duration_minutes} min)</span>
                  <span>{priceDetails.time_price.toFixed(2)} €</span>
                </div>
              )}
              {priceDetails.surcharge_evening > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Supplément soirée</span>
                  <span>+{priceDetails.surcharge_evening.toFixed(2)} €</span>
                </div>
              )}
              {priceDetails.surcharge_weekend > 0 && (
                <div className="flex justify-between text-amber-600">
                  <span>Supplément week-end</span>
                  <span>+{priceDetails.surcharge_weekend.toFixed(2)} €</span>
                </div>
              )}
              {priceDetails.tva_amount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>TVA</span>
                  <span>{priceDetails.tva_amount.toFixed(2)} €</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t flex justify-between items-center">
              <span className="font-semibold">Total TTC</span>
              <span className="text-2xl font-bold text-primary flex items-center gap-1">
                {priceDetails.total_price.toFixed(2)}
                <Euro className="w-5 h-5" />
              </span>
            </div>

            {priceDetails.pricing_source && (
              <p className="text-xs text-muted-foreground text-center">
                Tarification: {priceDetails.pricing_source === 'city' ? 'Grille ville' : 'Grille générale'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          En confirmant, vous acceptez ce devis et votre demande sera envoyée au gestionnaire 
          qui assignera un chauffeur disponible.
        </p>
      </div>

      {/* Refresh button */}
      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={calculatePrice} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Recalculer le prix
        </Button>
      </div>
    </div>
  );
}
