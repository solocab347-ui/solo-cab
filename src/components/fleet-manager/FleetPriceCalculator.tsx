import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateRoute } from "@/lib/geocoding";
import { 
  Calculator, MapPin, Navigation, Loader2, Euro, Clock, 
  Moon, Calendar, TrendingUp, MapPinned 
} from "lucide-react";

interface FleetPriceCalculatorProps {
  fleetManagerId: string;
}

interface PriceResult {
  base_price: number;
  distance_price: number;
  time_price: number;
  subtotal: number;
  tva_amount: number;
  total_price: number;
  surcharge_evening: number;
  surcharge_weekend: number;
  pricing_source: string;
  distance_km: number;
  duration_minutes: number;
}

// Helper pour extraire le nom de ville d'une adresse
const extractCityFromAddress = (address: string): string | null => {
  if (!address) return null;
  
  // Liste des grandes villes françaises à rechercher
  const cities = [
    "Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes",
    "Strasbourg", "Montpellier", "Bordeaux", "Lille", "Rennes",
    "Reims", "Saint-Étienne", "Toulon", "Le Havre", "Grenoble",
    "Dijon", "Angers", "Nîmes", "Villeurbanne"
  ];
  
  const lowerAddress = address.toLowerCase();
  for (const city of cities) {
    if (lowerAddress.includes(city.toLowerCase())) {
      return city;
    }
  }
  
  return null;
};

export const FleetPriceCalculator = ({ fleetManagerId }: FleetPriceCalculatorProps) => {
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<PriceResult | null>(null);

  const handlePickupChange = (address: string, coordinates?: { latitude: number; longitude: number }) => {
    setPickupAddress(address);
    if (coordinates) setPickupCoordinates(coordinates);
  };

  const handleDestinationChange = (address: string, coordinates?: { latitude: number; longitude: number }) => {
    setDestinationAddress(address);
    if (coordinates) setDestinationCoordinates(coordinates);
  };

  const handleCalculate = async () => {
    if (!pickupAddress || !destinationAddress) {
      toast.error("Veuillez renseigner les deux adresses");
      return;
    }

    if (!pickupCoordinates || !destinationCoordinates) {
      toast.error("Veuillez sélectionner les adresses dans la liste de suggestions");
      return;
    }

    setCalculating(true);
    setResult(null);

    try {
      // Étape 1: Calcul de l'itinéraire
      const routeResult = await calculateRoute(pickupCoordinates, destinationCoordinates);

      if (!routeResult.success || !routeResult.distance_km || !routeResult.duration_minutes) {
        toast.error(routeResult.error || "Impossible de calculer l'itinéraire");
        setCalculating(false);
        return;
      }

      const distanceKm = routeResult.distance_km;
      const durationMinutes = routeResult.duration_minutes;

      // Extraire les villes des adresses
      const pickupCity = extractCityFromAddress(pickupAddress);
      const destinationCity = extractCityFromAddress(destinationAddress);

      console.log("🏙️ Villes détectées:", { pickupCity, destinationCity });

      // Étape 2: Calcul du prix via RPC
      const { data: priceData, error: priceError } = await (supabase.rpc as any)("calculate_fleet_course_price", {
        p_fleet_manager_id: fleetManagerId,
        p_distance_km: distanceKm,
        p_duration_minutes: durationMinutes,
        p_use_hourly_rate: false,
        p_scheduled_date: null,
        p_pickup_city: pickupCity,
        p_destination_city: destinationCity
      });

      if (priceError) {
        console.error("Erreur calcul prix:", priceError);
        toast.error("Erreur lors du calcul du prix");
        setCalculating(false);
        return;
      }

      if (!priceData || priceData.length === 0) {
        toast.error("Erreur: Calcul de prix échoué");
        setCalculating(false);
        return;
      }

      const calculatedPrice = priceData[0];
      
      setResult({
        ...calculatedPrice,
        distance_km: distanceKm,
        duration_minutes: durationMinutes
      });

      toast.success("Prix calculé avec succès");
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors du calcul");
    } finally {
      setCalculating(false);
    }
  };

  const resetCalculator = () => {
    setPickupAddress("");
    setPickupCoordinates(null);
    setDestinationAddress("");
    setDestinationCoordinates(null);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Calculator className="w-6 h-6 text-primary" />
            </div>
            Calculateur de prix
          </CardTitle>
          <CardDescription>
            Estimez le prix d'une course en fonction de la distance et de vos tarifs configurés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Adresses */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-success" />
                Adresse de départ
              </Label>
              <AddressAutocomplete
                value={pickupAddress}
                onChange={handlePickupChange}
                placeholder="Entrez l'adresse de prise en charge..."
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-destructive" />
                Adresse d'arrivée
              </Label>
              <AddressAutocomplete
                value={destinationAddress}
                onChange={handleDestinationChange}
                placeholder="Entrez l'adresse de destination..."
              />
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleCalculate} 
              disabled={calculating || !pickupAddress || !destinationAddress}
              className="flex-1 gap-2"
            >
              {calculating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calculator className="w-4 h-4" />
              )}
              Calculer le prix
            </Button>
            {result && (
              <Button variant="outline" onClick={resetCalculator}>
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Résultat */}
      {result && (
        <Card className="border-success/30 bg-success/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-success" />
                Estimation du prix
              </CardTitle>
              <Badge 
                variant="outline" 
                className={result.pricing_source === "city" 
                  ? "border-primary/50 bg-primary/10 text-primary" 
                  : "border-muted"
                }
              >
                <MapPinned className="w-3 h-3 mr-1" />
                {result.pricing_source === "city" ? "Tarif ville" : "Tarif général"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Infos trajet */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Distance</p>
                <p className="text-2xl font-bold">{result.distance_km.toFixed(1)} km</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Durée estimée</p>
                <p className="text-2xl font-bold">{Math.round(result.duration_minutes)} min</p>
              </div>
            </div>

            <Separator />

            {/* Détail du prix */}
            <div className="space-y-3">
              {result.base_price > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prise en charge</span>
                  <span>{result.base_price.toFixed(2)} €</span>
                </div>
              )}
              {result.distance_price > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prix distance ({result.distance_km.toFixed(1)} km)</span>
                  <span>{result.distance_price.toFixed(2)} €</span>
                </div>
              )}
              {result.time_price > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Prix temps
                  </span>
                  <span>{result.time_price.toFixed(2)} €</span>
                </div>
              )}
              {result.surcharge_evening > 0 && (
                <div className="flex justify-between text-sm text-warning">
                  <span className="flex items-center gap-1">
                    <Moon className="w-3 h-3" />
                    Majoration soirée
                  </span>
                  <span>+{result.surcharge_evening.toFixed(2)} €</span>
                </div>
              )}
              {result.surcharge_weekend > 0 && (
                <div className="flex justify-between text-sm text-warning">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Majoration week-end
                  </span>
                  <span>+{result.surcharge_weekend.toFixed(2)} €</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span>{result.subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA</span>
                <span>{result.tva_amount.toFixed(2)} €</span>
              </div>

              <Separator />

              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-semibold">Total TTC</span>
                <span className="text-3xl font-bold text-success">{result.total_price.toFixed(2)} €</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};