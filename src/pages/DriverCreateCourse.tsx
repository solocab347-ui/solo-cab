import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Car, MapPin, Calendar, Users, ArrowLeft, Calculator, Clock, UserX } from "lucide-react";
import { calculateRoute } from "@/lib/geocoding";
import { useCourseCreation } from "@/hooks/useCourseCreation";
import { validateCoordinates } from "@/lib/courseValidation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { sanitizeAddress, sanitizeString, sanitizeInteger } from "@/lib/inputSanitizer";
import { CoursePaymentMethodSelector } from "@/components/shared/CoursePaymentMethodSelector";

interface Client {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

const DriverCreateCourse = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { createCourse, loading: courseLoading } = useCourseCreation();
  const preSelectedClientId = searchParams.get("client_id");

  // Scroll automatique en haut de la page au chargement
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [courseType, setCourseType] = useState<"classic" | "hourly">("classic");
  
  // Form fields
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [passengersCount, setPassengersCount] = useState("1");
  const [notes, setNotes] = useState("");
  
  // Pour mise à disposition
  const [durationHours, setDurationHours] = useState("");
  const [paymentMethodPreference, setPaymentMethodPreference] = useState("not_specified");
  
  // Calcul automatique
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [maxPassengers, setMaxPassengers] = useState(4);

  const fetchDriverProfile = async () => {
    if (!user) return;

    try {
      const { data: driver, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("❌ Error fetching driver profile:", error);
        toast.error("Erreur lors du chargement du profil");
        return;
      }

      if (driver) {
        setDriverProfile(driver);
        setMaxPassengers(driver.max_passengers || 4);
      }
    } catch (err) {
      console.error("❌ Exception fetching driver profile:", err);
      toast.error("Erreur lors du chargement du profil");
    }
  };

  const fetchClients = async () => {
    if (!user) return;

    try {
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (driverError) {
        console.error("❌ Error fetching driver ID:", driverError);
        toast.error("Erreur lors du chargement des clients");
        return;
      }

      if (!driverData) {
        console.warn("⚠️ No driver data found for user");
        return;
      }

      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select(`
          id,
          user_id,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .or(`driver_id.eq.${driverData.id},driver_ids.cs.{${driverData.id}}`)
        .order("created_at", { ascending: false });

      if (clientsError) {
        console.error("❌ Error fetching clients:", clientsError);
        toast.error("Erreur lors du chargement des clients");
        return;
      }

      if (clientsData) {
        setClients(clientsData as Client[]);
      }
    } catch (err) {
      console.error("❌ Exception fetching clients:", err);
      toast.error("Erreur lors du chargement des clients");
    }
  };

  useEffect(() => {
    if (user) {
      fetchDriverProfile();
      fetchClients();
    }
  }, [user]);

  useEffect(() => {
    if (preSelectedClientId && clients.length > 0) {
      setSelectedClientId(preSelectedClientId);
    }
  }, [preSelectedClientId, clients]);

  useEffect(() => {
    if (courseType === "classic" && pickupCoordinates && destinationCoordinates && driverProfile) {
      calculateRouteData();
    }
  }, [pickupCoordinates, destinationCoordinates, courseType, driverProfile]);

  useEffect(() => {
    if (driverProfile) {
      calculateEstimatedPrice();
    }
  }, [distanceKm, durationMinutes, durationHours, courseType, driverProfile]);


  const calculateRouteData = async () => {
    if (!pickupCoordinates || !destinationCoordinates) return;

    setCalculating(true);
    try {
      // SYSTÈME RENFORCÉ: Utilisation de la fonction centralisée
      const routeResult = await calculateRoute(pickupCoordinates, destinationCoordinates);
      
      if (routeResult.success && routeResult.distance_km && routeResult.duration_minutes) {
        setDistanceKm(routeResult.distance_km);
        setDurationMinutes(routeResult.duration_minutes);
      }
    } finally {
      setCalculating(false);
    }
  };

  const calculateEstimatedPrice = () => {
    if (!driverProfile) return;

    let estimatedPrice = 0;
    const minimumPrice = driverProfile.minimum_price || 0;

    if (courseType === "classic" && distanceKm !== null) {
      // Course classique : base + distance
      const baseFare = driverProfile.base_fare || 0;
      const perKmRate = driverProfile.per_km_rate || 0;
      const tvaRate = 10; // TVA 10% pour facturation au km
      
      let subtotal = 0;
      
      // SYSTÈME RENFORCÉ: Tenir compte du paramètre tva_included du chauffeur
      if (driverProfile.tva_included) {
        // TVA COMPRISE : calculer le HT puis recalculer le TTC
        const baseFareHT = baseFare / (1 + tvaRate / 100);
        const perKmRateHT = perKmRate / (1 + tvaRate / 100);
        const subtotalHT = baseFareHT + (distanceKm * perKmRateHT);
        const tva = subtotalHT * (tvaRate / 100);
        subtotal = subtotalHT + tva;
      } else {
        // TVA NON COMPRISE : ajouter la TVA au subtotal
        const rawSubtotal = baseFare + (distanceKm * perKmRate);
        const tva = rawSubtotal * (tvaRate / 100);
        subtotal = rawSubtotal + tva;
      }
      
      // APPLIQUER LE PRIX MINIMUM pour les courses classiques
      if (minimumPrice > 0 && subtotal < minimumPrice) {
        estimatedPrice = minimumPrice;
      } else {
        estimatedPrice = subtotal;
      }
    } else if (courseType === "hourly" && durationHours) {
      // Mise à disposition : durée * tarif horaire
      const hourlyRate = driverProfile.hourly_rate || 0;
      const hours = parseFloat(durationHours);
      const tvaRate = 20; // TVA 20% pour mise à disposition
      
      // SYSTÈME RENFORCÉ: Tenir compte du paramètre tva_included du chauffeur
      if (driverProfile.tva_included) {
        // TVA COMPRISE : calculer le HT puis recalculer le TTC
        const timeHT = (hours * hourlyRate) / (1 + tvaRate / 100);
        const tva = timeHT * (tvaRate / 100);
        estimatedPrice = timeHT + tva;
      } else {
        // TVA NON COMPRISE : ajouter la TVA au subtotal
        const subtotal = hours * hourlyRate;
        const tva = subtotal * (tvaRate / 100);
        estimatedPrice = subtotal + tva;
      }
      // Note: Le prix minimum ne s'applique pas aux mises à disposition
    }

    setCalculatedPrice(estimatedPrice > 0 ? parseFloat(estimatedPrice.toFixed(2)) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !selectedClientId) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    // VALIDATION: Vérifier les coordonnées
    if (!validateCoordinates(pickupCoordinates) || !validateCoordinates(destinationCoordinates)) {
      toast.error("Veuillez sélectionner des adresses valides avec le système d'autocomplétion");
      return;
    }

    // VALIDATION: Vérifier la date
    if (!scheduledDate) {
      toast.error("Veuillez sélectionner une date");
      return;
    }

    // VALIDATION: Pour mise à disposition, vérifier la durée
    if (courseType === "hourly" && !durationHours) {
      toast.error("Veuillez indiquer la durée en heures pour une mise à disposition");
      return;
    }

    // VALIDATION: Pour course classique, vérifier distance
    if (courseType === "classic" && (!distanceKm || !durationMinutes)) {
      toast.error("Impossible de créer la course sans calcul de distance. Veuillez vérifier les adresses.");
      return;
    }

    setLoading(true);

    try {
      const { data: driverData } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!driverData) {
        toast.error("Profil chauffeur introuvable");
        setLoading(false);
        return;
      }

      // SÉCURITÉ: Sanitize inputs avant envoi
      const sanitizedPickup = sanitizeAddress(pickupAddress);
      const sanitizedDestination = sanitizeAddress(destinationAddress);
      const sanitizedNotes = sanitizeString(notes);
      const sanitizedPassengers = sanitizeInteger(passengersCount, 1, maxPassengers).toString();

      // Utiliser le hook sécurisé pour créer la course
      const course = await createCourse({
        userId: user.id,
        clientId: selectedClientId,
        driverId: driverData.id,
        pickupAddress: sanitizedPickup,
        pickupCoordinates,
        destinationAddress: sanitizedDestination,
        destinationCoordinates,
        scheduledDate,
        passengersCount: sanitizedPassengers,
        notes: sanitizedNotes,
        promoCode: undefined, // Les drivers ne gèrent pas les promos lors de la création
        courseType,
        durationHours,
        paymentMethodPreference: paymentMethodPreference !== "not_specified" ? paymentMethodPreference : undefined,
      });

      if (course) {
        toast.success("Course et devis créés avec succès !");
        setTimeout(() => navigate("/driver-dashboard"), 1500);
      }
    } catch (error: any) {
      console.error("❌ Unexpected error:", error);
      toast.error("Une erreur inattendue est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
        <NavigationHeader 
          showBack={true}
          showHome={true}
          homeRoute="/driver-dashboard"
        />

        <Card className="p-8 bg-card border-primary/10 mt-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shadow-lg">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Créer une Course</h1>
              <p className="text-muted-foreground">Pour un de vos clients</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sélection du client */}
            <ErrorBoundary fallback={
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Client *
                </Label>
                <Input 
                  value="Erreur de chargement des clients" 
                  disabled 
                  className="bg-destructive/10"
                />
              </div>
            }>
              <div className="space-y-2">
                <Label htmlFor="client" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Client *
                </Label>
                <Select 
                  value={selectedClientId} 
                  onValueChange={(value) => {
                    if (value === "__unregistered__") {
                      navigate("/driver/create-direct-course");
                    } else {
                      setSelectedClientId(value);
                    }
                  }}
                  key={`client-select-${clients.length}`}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Sélectionnez un client" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border border-border z-50">
                    {/* Option client non enregistré en premier */}
                    <SelectItem 
                      value="__unregistered__"
                      className="border-b border-border mb-1 pb-2"
                    >
                      <div className="flex items-center gap-2">
                        <UserX className="h-4 w-4 text-orange-500" />
                        <span className="font-medium text-orange-500">Client non enregistré</span>
                      </div>
                    </SelectItem>
                    
                    {clients.map((client) => (
                      <SelectItem 
                        key={`client-${client.id}`} 
                        value={client.id}
                      >
                        {client.profiles?.full_name} ({client.profiles?.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Aucun client enregistré. Utilisez "Client non enregistré" ou invitez des clients via votre QR code.
                  </p>
                )}
              </div>
            </ErrorBoundary>

            {/* Type de course */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Type de course *
              </Label>
              <RadioGroup value={courseType} onValueChange={(value) => setCourseType(value as "classic" | "hourly")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="classic" id="classic" />
                  <Label htmlFor="classic" className="font-normal cursor-pointer">
                    Course classique (facturation au km - TVA 10%)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hourly" id="hourly" />
                  <Label htmlFor="hourly" className="font-normal cursor-pointer">
                    Mise à disposition (facturation à l'heure - TVA 20%)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Adresses */}
            <div className="space-y-4">
              <div className="bg-card/50 p-6 rounded-lg border border-border space-y-4">
                <h3 className="font-semibold flex items-center gap-2 text-lg text-foreground">
                  <MapPin className="w-5 h-5 text-primary" />
                  Itinéraire de la course
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="pickup" className="text-base font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Point de départ *
                  </Label>
                  <AddressAutocomplete
                    value={pickupAddress}
                    onChange={(address, coords) => {
                      setPickupAddress(address);
                      if (coords) {
                        setPickupCoordinates(coords);
                      } else {
                        setPickupCoordinates(null);
                      }
                    }}
                    placeholder="Ex: 15 Rue de la Paix, 75002 Paris"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tapez l'adresse complète avec ville et code postal
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination" className="text-base font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-destructive" />
                    Point d'arrivée *
                  </Label>
                  <AddressAutocomplete
                    value={destinationAddress}
                    onChange={(address, coords) => {
                      setDestinationAddress(address);
                      if (coords) {
                        setDestinationCoordinates(coords);
                      } else {
                        setDestinationCoordinates(null);
                      }
                    }}
                    placeholder="Ex: Aéroport Charles de Gaulle, 95700 Roissy"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sélectionnez l'adresse dans la liste déroulante
                  </p>
                </div>
              </div>
            </div>

            {/* Calculs automatiques */}
            {courseType === "classic" && distanceKm !== null && (
              <Card className="p-4 bg-card border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Distance calculée</p>
                    <p className="text-2xl font-bold text-foreground">{distanceKm} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Durée estimée</p>
                    <p className="text-2xl font-bold text-foreground">{durationMinutes} min</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Durée pour mise à disposition */}
            {courseType === "hourly" && (
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Durée de la mise à disposition (heures) *
                </Label>
                <Input
                  id="duration"
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  placeholder="2.5"
                  required={courseType === "hourly"}
                />
                <p className="text-xs text-muted-foreground">
                  Exemple : 2.5 pour 2h30
                </p>
              </div>
            )}

            {/* Prix estimé */}
            {calculatedPrice !== null && (
              <Card className="p-4 bg-card border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">Prix estimé TTC</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {courseType === "classic" ? "TVA 10% incluse" : "TVA 20% incluse"}
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{calculatedPrice}€</p>
                </div>
              </Card>
            )}

            {/* Date et passagers */}
            <div className="bg-card/50 p-6 rounded-lg border border-border space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-lg text-foreground">
                <Calendar className="w-5 h-5 text-primary" />
                Détails de la réservation
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-base font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Date et heure du départ *
                  </Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Date et heure exacte du rendez-vous
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passengers" className="text-base font-medium flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Nombre de passagers *
                  </Label>
                  <Input
                    id="passengers"
                    type="number"
                    min="1"
                    max={maxPassengers}
                    value={passengersCount}
                    onChange={(e) => setPassengersCount(e.target.value)}
                    required
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Capacité maximale : {maxPassengers} personnes
                  </p>
                </div>
              </div>
            </div>

            {/* Moyen de paiement */}
            <div className="bg-card/50 p-6 rounded-lg border border-border">
              <CoursePaymentMethodSelector
                value={paymentMethodPreference}
                onChange={setPaymentMethodPreference}
                driverId={driverProfile?.id}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base font-medium">Notes complémentaires</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bagages volumineux, animaux, demandes particulières..."
                rows={3}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/driver-dashboard")}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading || courseLoading || calculating || !selectedClientId}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              >
                {loading || courseLoading ? "Création..." : calculating ? "Calcul en cours..." : "Créer la course"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default DriverCreateCourse;
