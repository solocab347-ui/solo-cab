import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Calculator, MapPin, Navigation, Plus } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { calculateRoute } from "@/lib/geocoding";

interface PriceCalculatorProps {
  driverProfile: any;
}

export const PriceCalculator = ({ driverProfile }: PriceCalculatorProps) => {
  const navigate = useNavigate();
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);

  const handleCalculate = async () => {
    // Validation stricte des entrées
    if (!pickupAddress || !destinationAddress) {
      toast.error("Veuillez renseigner les deux adresses");
      return;
    }

    if (!pickupCoordinates || !destinationCoordinates) {
      toast.error("Veuillez sélectionner les adresses dans la liste de suggestions");
      return;
    }

    // Validation de la structure du profil chauffeur
    if (!driverProfile?.driver?.id) {
      console.error("❌ CALCULATOR: Structure driverProfile invalide", driverProfile);
      toast.error("Erreur: Profil chauffeur non disponible");
      return;
    }

    setCalculating(true);
    console.log("🧮 CALCULATOR: Début du calcul de prix");
    console.log("   Driver ID:", driverProfile.driver.id);
    console.log("   Départ:", pickupAddress);
    console.log("   Arrivée:", destinationAddress);

    try {
      // Étape 1: Calcul de l'itinéraire avec le système renforcé
      console.log("🗺️ CALCULATOR: Calcul de l'itinéraire...");
      const routeResult = await calculateRoute(pickupCoordinates, destinationCoordinates);

      if (!routeResult.success || !routeResult.distance_km || !routeResult.duration_minutes) {
        console.error("❌ CALCULATOR: Échec calcul itinéraire", routeResult);
        toast.error(routeResult.error || "Impossible de calculer l'itinéraire");
        setCalculating(false);
        return;
      }

      const distanceKm = routeResult.distance_km;
      const durationMinutes = routeResult.duration_minutes;

      console.log(`✅ CALCULATOR: Itinéraire calculé - ${distanceKm} km, ${durationMinutes} min`);

      // Étape 2: Calcul du prix avec les paramètres du chauffeur
      console.log("💰 CALCULATOR: Calcul du prix...");
      const { data: priceData, error: priceError } = await supabase.rpc("calculate_course_price", {
        _driver_id: driverProfile.driver.id,
        _distance_km: distanceKm,
        _duration_minutes: durationMinutes,
        _use_hourly_rate: false,
      });

      if (priceError) {
        console.error("❌ CALCULATOR: Erreur RPC calculate_course_price", priceError);
        toast.error("Erreur lors du calcul du prix. Vérifiez vos paramètres tarifaires.");
        setCalculating(false);
        return;
      }

      if (!priceData || priceData.length === 0) {
        console.error("❌ CALCULATOR: Aucune donnée de prix retournée");
        toast.error("Erreur: Calcul de prix échoué");
        setCalculating(false);
        return;
      }

      const calculatedPrice = priceData[0];
      console.log("✅ CALCULATOR: Prix calculé", calculatedPrice);

      // Validation du résultat du prix
      if (!calculatedPrice.total_price || calculatedPrice.total_price <= 0) {
        console.error("❌ CALCULATOR: Prix invalide", calculatedPrice);
        toast.error("Erreur: Prix calculé invalide. Vérifiez vos paramètres tarifaires.");
        setCalculating(false);
        return;
      }

      setResult({
        distance: distanceKm.toFixed(2),
        duration: durationMinutes,
        price: calculatedPrice,
      });

      // Étape 3: Charger les clients pour la création de course
      console.log("👥 CALCULATOR: Chargement des clients...");
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select(`
          id,
          user_id,
          profiles!clients_user_id_fkey (
            full_name,
            email
          )
        `)
        .or(`driver_id.eq.${driverProfile.driver.id},driver_ids.cs.{${driverProfile.driver.id}}`);

      if (clientsError) {
        console.warn("⚠️ CALCULATOR: Erreur chargement clients", clientsError);
        // Ne pas bloquer si les clients ne se chargent pas
        setClients([]);
      } else {
        setClients(clientsData || []);
        console.log(`✅ CALCULATOR: ${clientsData?.length || 0} clients chargés`);
      }

      toast.success("✅ Prix calculé avec succès !", {
        description: `Distance: ${distanceKm.toFixed(2)} km • Durée: ${durationMinutes} min • Prix TTC: ${calculatedPrice.total_price.toFixed(2)}€`,
        duration: 6000
      });

      console.log("✅ CALCULATOR: Calcul terminé avec succès");
    } catch (error: any) {
      console.error("❌ CALCULATOR: Exception durant le calcul", error);
      toast.error("Erreur lors du calcul du prix. Veuillez réessayer.");
    } finally {
      setCalculating(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!selectedClientId) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    setCreatingCourse(true);
    try {
      // Créer la course
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .insert({
          client_id: selectedClientId,
          driver_id: driverProfile.driver.id,
          pickup_address: pickupAddress,
          pickup_latitude: pickupCoordinates?.latitude,
          pickup_longitude: pickupCoordinates?.longitude,
          destination_address: destinationAddress,
          destination_latitude: destinationCoordinates?.latitude,
          destination_longitude: destinationCoordinates?.longitude,
          distance_km: parseFloat(result.distance),
          duration_minutes: result.duration,
          scheduled_date: new Date().toISOString(),
          passengers_count: 1,
          status: "pending",
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Créer le devis automatique
      await supabase.functions.invoke("create-devis-auto", {
        body: {
          course_id: courseData.id,
          driver_id: driverProfile.driver.id,
          client_id: selectedClientId,
        },
      });

      toast.success("Course créée avec succès !");
      
      // Réinitialiser le formulaire
      setPickupAddress("");
      setPickupCoordinates(null);
      setDestinationAddress("");
      setDestinationCoordinates(null);
      setResult(null);
      setSelectedClientId("");
      
      // Rediriger vers Mes Courses
      navigate("/driver-dashboard");
    } catch (error: any) {
      console.error("Erreur création course:", error);
      toast.error("Erreur lors de la création de la course");
    } finally {
      setCreatingCourse(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-8 bg-gradient-to-br from-card to-card/50 border-border/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-brown/20 rounded-lg flex items-center justify-center">
            <Calculator className="w-6 h-6 text-brown-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Calculatrice Rapide</h3>
            <p className="text-sm text-muted-foreground">Calculez un trajet sans créer de course</p>
          </div>
        </div>

        <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-medium">
                <MapPin className="w-5 h-5 text-success" />
                📍 Adresse de départ
              </Label>
              <AddressAutocomplete
                value={pickupAddress}
                onChange={(address, coords) => {
                  setPickupAddress(address);
                  if (coords) setPickupCoordinates(coords);
                }}
                placeholder="Ex: 15 Rue de la Paix, 75002 Paris"
              />
              <p className="text-xs text-muted-foreground">
                Tapez l'adresse complète puis sélectionnez dans la liste
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-base font-medium">
                <Navigation className="w-5 h-5 text-destructive" />
                🏁 Adresse de destination
              </Label>
              <AddressAutocomplete
                value={destinationAddress}
                onChange={(address, coords) => {
                  setDestinationAddress(address);
                  if (coords) setDestinationCoordinates(coords);
                }}
                placeholder="Ex: Aéroport Charles de Gaulle, 95700 Roissy"
              />
              <p className="text-xs text-muted-foreground">
                Attendez les suggestions puis cliquez pour sélectionner
              </p>
            </div>

          <Button
            onClick={handleCalculate}
            disabled={calculating || !pickupAddress || !destinationAddress}
            className="w-full bg-gradient-to-r from-success to-trust text-white"
            size="lg"
          >
            <Calculator className="w-5 h-5 mr-2" />
            {calculating ? "Calcul en cours..." : "Calculer"}
          </Button>
        </div>
      </Card>

      {/* Résultat du calcul */}
      {result && (
        <Card className="p-6 bg-gradient-premium border-0">
          <h4 className="text-lg font-bold mb-4 text-premium-foreground">Résultat du calcul</h4>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-premium-foreground/10 rounded-lg p-4">
              <p className="text-sm text-premium-foreground/70 mb-1">Distance</p>
              <p className="text-2xl font-bold text-premium-foreground">{result.distance} km</p>
            </div>
            <div className="bg-premium-foreground/10 rounded-lg p-4">
              <p className="text-sm text-premium-foreground/70 mb-1">Durée estimée</p>
              <p className="text-2xl font-bold text-premium-foreground">{result.duration} min</p>
            </div>
            <div className="bg-premium-foreground/10 rounded-lg p-4">
              <p className="text-sm text-premium-foreground/70 mb-1">Prix TTC</p>
              <p className="text-2xl font-bold text-premium-foreground">{result.price.total_price.toFixed(2)} €</p>
            </div>
          </div>

          <div className="bg-premium-foreground/10 rounded-lg p-4 mb-6">
            <h5 className="font-semibold mb-2 text-premium-foreground">Détails du prix</h5>
            <div className="space-y-1 text-sm text-premium-foreground/80">
              <div className="flex justify-between">
                <span>Forfait de base</span>
                <span>{result.price.base_price.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span>Distance ({result.distance} km)</span>
                <span>{result.price.distance_price.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span>Sous-total HT</span>
                <span>{result.price.subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between">
                <span>TVA (10%)</span>
                <span>{result.price.tva_amount.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between font-bold text-premium-foreground pt-2 border-t border-premium-foreground/20">
                <span>Total TTC</span>
                <span>{result.price.total_price.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* Créer une course avec ce calcul */}
          <div className="space-y-4 pt-6 border-t border-premium-foreground/20">
            <h5 className="font-semibold text-premium-foreground">Créer une course avec ce calcul</h5>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sélectionner un client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="bg-premium-foreground/10 border-premium-foreground/20 text-premium-foreground">
                  <SelectValue placeholder="Choisir un client" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-[100000] max-h-80">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.profiles.full_name} ({client.profiles.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCreateCourse}
              disabled={creatingCourse || !selectedClientId}
              className="w-full bg-premium-foreground text-premium hover:bg-premium-foreground/90"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              {creatingCourse ? "Création en cours..." : "Créer une course"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
