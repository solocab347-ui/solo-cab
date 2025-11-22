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
import { Car, MapPin, Calendar, Users, ArrowLeft, Calculator, Clock } from "lucide-react";
import { calculateRoute, validateCourseData } from "@/lib/geocoding";

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
  const preSelectedClientId = searchParams.get("client_id");

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
  
  // Calcul automatique
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  const [driverProfile, setDriverProfile] = useState<any>(null);

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

    if (courseType === "classic" && distanceKm !== null) {
      // Course classique : base + distance
      const baseFare = driverProfile.base_fare || 0;
      const perKmRate = driverProfile.per_km_rate || 0;
      const subtotal = baseFare + (distanceKm * perKmRate);
      const tvaRate = 10; // TVA 10% pour facturation au km
      const tva = subtotal * (tvaRate / 100);
      estimatedPrice = subtotal + tva;
    } else if (courseType === "hourly" && durationHours) {
      // Mise à disposition : durée * tarif horaire
      const hourlyRate = driverProfile.hourly_rate || 0;
      const hours = parseFloat(durationHours);
      const subtotal = hours * hourlyRate;
      const tvaRate = 20; // TVA 20% pour mise à disposition
      const tva = subtotal * (tvaRate / 100);
      estimatedPrice = subtotal + tva;
    }

    setCalculatedPrice(estimatedPrice > 0 ? parseFloat(estimatedPrice.toFixed(2)) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !selectedClientId) {
      toast.error("Veuillez sélectionner un client");
      return;
    }

    // VALIDATION STRICTE: Vérification complète des données
    const validation = validateCourseData(
      pickupAddress,
      destinationAddress,
      pickupCoordinates,
      destinationCoordinates,
      scheduledDate
    );

    if (!validation.valid) {
      toast.error(validation.error || "Données de course invalides");
      return;
    }

    if (courseType === "hourly" && !durationHours) {
      toast.error("Veuillez indiquer la durée en heures pour une mise à disposition");
      return;
    }

    // Validation supplémentaire pour course classique
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
        return;
      }

      // Create course (chauffeur créé = une seule acceptation client suffit)
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          client_id: selectedClientId,
          driver_id: driverData.id,
          driver_ids: [driverData.id],
          pickup_address: pickupAddress,
          pickup_latitude: pickupCoordinates?.latitude || null,
          pickup_longitude: pickupCoordinates?.longitude || null,
          destination_address: destinationAddress,
          destination_latitude: destinationCoordinates?.latitude || null,
          destination_longitude: destinationCoordinates?.longitude || null,
          scheduled_date: new Date(scheduledDate).toISOString(),
          passengers_count: parseInt(passengersCount),
          distance_km: distanceKm,
          duration_minutes: courseType === "hourly" ? parseFloat(durationHours) * 60 : durationMinutes,
          notes: notes || null,
          status: "pending",
          created_by_user_id: user.id, // Chauffeur créateur
        })
        .select()
        .single();

      if (courseError) {
        console.error("Course creation error:", courseError);
        toast.error("Erreur lors de la création de la course");
        return;
      }

      console.log("Course created:", course);

      // Génération automatique du devis
      try {
        const { data: devisData, error: devisError } = await supabase.functions.invoke(
          'create-devis-auto',
          {
            body: {
              course_id: course.id,
              driver_id: driverData.id,
              use_hourly_rate: courseType === "hourly",
            },
          }
        );

        if (devisError) {
          console.error("Devis auto-generation error:", devisError);
          toast.warning("Course créée mais erreur lors de la génération du devis");
        } else {
          console.log("Devis auto-generated:", devisData);
          toast.success("Course et devis créés avec succès !");
        }
      } catch (devisGenError) {
        console.error("Devis generation exception:", devisGenError);
        toast.warning("Course créée, le devis sera généré ultérieurement");
      }
      
      // Redirect to driver dashboard
      setTimeout(() => navigate("/driver-dashboard"), 1500);

    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/driver-dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au dashboard
        </Button>

        <Card className="p-8 bg-card border-primary/10">
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
            <div className="space-y-2">
              <Label htmlFor="client" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Client *
              </Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sélectionnez un client" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-50">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.profiles?.full_name} ({client.profiles?.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucun client enregistré. Invitez des clients via votre QR code.
                </p>
              )}
            </div>

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
              <div className="space-y-2">
                <Label htmlFor="pickup" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Adresse de départ *
                </Label>
                <AddressAutocomplete
                  value={pickupAddress}
                  onChange={(address, coords) => {
                    setPickupAddress(address);
                    if (coords) setPickupCoordinates(coords);
                  }}
                  placeholder="Commencez à taper l'adresse..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-foreground" />
                  Adresse d'arrivée *
                </Label>
                <AddressAutocomplete
                  value={destinationAddress}
                  onChange={(address, coords) => {
                    setDestinationAddress(address);
                    if (coords) setDestinationCoordinates(coords);
                  }}
                  placeholder="Commencez à taper l'adresse..."
                />
              </div>
            </div>

            {/* Calculs automatiques */}
            {courseType === "classic" && distanceKm !== null && (
              <Card className="p-4 bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Distance calculée</p>
                    <p className="text-2xl font-bold text-primary">{distanceKm} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Durée estimée</p>
                    <p className="text-2xl font-bold text-primary">{durationMinutes} min</p>
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
              <Card className="p-4 bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">Prix estimé TTC</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {courseType === "classic" ? "TVA 10% incluse" : "TVA 20% incluse"}
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-primary">{calculatedPrice}€</p>
                </div>
              </Card>
            )}

            {/* Date et passagers */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date et heure de départ *
                </Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passengers" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Nombre de passagers *
                </Label>
                <Input
                  id="passengers"
                  type="number"
                  min="1"
                  max="8"
                  value={passengersCount}
                  onChange={(e) => setPassengersCount(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes complémentaires</Label>
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
                disabled={loading || calculating || !selectedClientId}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              >
                {loading ? "Création..." : calculating ? "Calcul en cours..." : "Créer la course"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default DriverCreateCourse;
