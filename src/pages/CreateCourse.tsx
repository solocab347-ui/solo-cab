import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Car, MapPin, Calendar, Users, ArrowLeft, Tag } from "lucide-react";

const CreateCourse = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const driverId = searchParams.get("driver_id");

  const [loading, setLoading] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [passengersCount, setPassengersCount] = useState("1");
  const [maxPassengers, setMaxPassengers] = useState(4);
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);
  const [clientAddress, setClientAddress] = useState("");
  const [useAddressPickup, setUseAddressPickup] = useState(false);
  const [useAddressDestination, setUseAddressDestination] = useState(false);

  // Fetch client address on mount
  useEffect(() => {
    const fetchClientAddress = async () => {
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("address")
        .eq("id", user.id)
        .single();

      if (profileData?.address) {
        setClientAddress(profileData.address);
      }
    };

    fetchClientAddress();
  }, [user]);

  // Geocode client address to get coordinates
  const geocodeAddress = async (address: string) => {
    try {
      const { data: tokenData } = await supabase.functions.invoke("get-mapbox-token");
      if (!tokenData?.token) {
        console.error("Mapbox token non disponible");
        return null;
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          address
        )}.json?access_token=${tokenData.token}&country=FR&language=fr&limit=1`
      );

      if (!response.ok) {
        console.error("Erreur geocoding");
        return null;
      }

      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center;
        return { latitude, longitude };
      }
      return null;
    } catch (error) {
      console.error("Erreur lors du géocodage:", error);
      return null;
    }
  };

  // Apply client address when checkbox is checked
  useEffect(() => {
    const applyPickupAddress = async () => {
      if (useAddressPickup && clientAddress) {
        setPickupAddress(clientAddress);
        // Géocoder l'adresse pour obtenir les coordonnées
        const coords = await geocodeAddress(clientAddress);
        if (coords) {
          setPickupCoordinates(coords);
          console.log("✅ Coordonnées départ extraites:", coords);
        } else {
          toast.warning("Impossible de localiser l'adresse de départ");
        }
      } else if (!useAddressPickup) {
        setPickupAddress("");
        setPickupCoordinates(null);
      }
    };
    
    applyPickupAddress();
  }, [useAddressPickup, clientAddress]);

  useEffect(() => {
    const applyDestinationAddress = async () => {
      if (useAddressDestination && clientAddress) {
        setDestinationAddress(clientAddress);
        // Géocoder l'adresse pour obtenir les coordonnées
        const coords = await geocodeAddress(clientAddress);
        if (coords) {
          setDestinationCoordinates(coords);
          console.log("✅ Coordonnées destination extraites:", coords);
        } else {
          toast.warning("Impossible de localiser l'adresse de destination");
        }
      } else if (!useAddressDestination) {
        setDestinationAddress("");
        setDestinationCoordinates(null);
      }
    };
    
    applyDestinationAddress();
  }, [useAddressDestination, clientAddress]);

  // Fetch driver's max_passengers and available promos on component mount
  useEffect(() => {
    const fetchDriverMaxPassengers = async () => {
      if (!driverId) return;
      
      const { data: driverData } = await supabase
        .from("drivers")
        .select("max_passengers")
        .eq("id", driverId)
        .maybeSingle();
      
      if (driverData && driverData.max_passengers) {
        setMaxPassengers(driverData.max_passengers);
      }
    };
    
    fetchDriverMaxPassengers();
  }, [driverId]);

  // Fetch available promotions for the client
  useEffect(() => {
    const fetchAvailablePromos = async () => {
      if (!user) return;

      try {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!clientData) return;

        const { data: promos } = await supabase
          .from("promotion_assignments")
          .select(`
            promotion_id,
            promotions (
              id,
              code,
              description,
              type,
              value,
              active,
              valid_until,
              max_uses,
              current_uses
            )
          `)
          .eq("client_id", clientData.id);

        if (promos) {
          const validPromos = promos
            .filter((p: any) => {
              const promo = p.promotions;
              if (!promo || !promo.active) return false;
              if (promo.valid_until && new Date(promo.valid_until) < new Date()) return false;
              if (promo.max_uses && promo.current_uses >= promo.max_uses) return false;
              return true;
            })
            .map((p: any) => p.promotions);
          
          setAvailablePromos(validPromos);
        }
      } catch (error) {
        console.error("Error fetching promos:", error);
      }
    };

    fetchAvailablePromos();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Vous devez être connecté");
      navigate("/login");
      return;
    }

    if (!pickupAddress || !destinationAddress || !scheduledDate) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      // Get client_id
      const { data: clientData } = await supabase
        .from("clients")
        .select("id, driver_id, is_exclusive")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clientData) {
        toast.error("Profil client introuvable");
        return;
      }

      // Prepare driver_ids array (dual association)
      let driverIds: string[] = [];
      let assignedDriverId: string | null = null;

      if (clientData.is_exclusive && clientData.driver_id) {
        // Client exclusif : assigner au chauffeur attitré
        assignedDriverId = clientData.driver_id;
        driverIds = [clientData.driver_id];
      } else if (driverId) {
        // Client libre : assigner au chauffeur choisi
        assignedDriverId = driverId;
        driverIds = [driverId];
      } else {
        toast.error("Aucun chauffeur sélectionné");
        return;
      }

      // SYSTÈME RENFORCÉ: Calculer la distance et la durée via Edge Function Mapbox
      let calculatedDistance: number | null = null;
      let calculatedDuration: number | null = null;

      if (pickupCoordinates && destinationCoordinates) {
        try {
          console.log("🗺️ Appel Edge Function calculate-mapbox-route...");
          
          const { data: routeData, error: routeError } = await supabase.functions.invoke(
            'calculate-mapbox-route',
            {
              body: {
                pickup_latitude: pickupCoordinates.latitude,
                pickup_longitude: pickupCoordinates.longitude,
                destination_latitude: destinationCoordinates.latitude,
                destination_longitude: destinationCoordinates.longitude,
              },
            }
          );

          if (routeError) {
            console.error("❌ Erreur Edge Function Mapbox:", routeError);
            toast.error("Impossible de calculer la distance automatiquement");
            throw routeError;
          }

          if (routeData?.success) {
            calculatedDistance = routeData.distance_km;
            calculatedDuration = routeData.duration_minutes;
            
            console.log("✅ CALCUL MAPBOX RÉUSSI:");
            console.log("   - Distance:", calculatedDistance, "km");
            console.log("   - Durée:", calculatedDuration, "minutes");
            
            toast.success(`Distance calculée: ${calculatedDistance} km`);
          } else {
            console.warn("⚠️ Aucun itinéraire trouvé");
            toast.warning("Distance non calculée - le devis sera basé sur le forfait de base uniquement");
          }
        } catch (mapboxError) {
          console.error("❌ ERREUR CRITIQUE calcul Mapbox:", mapboxError);
          toast.error("Erreur lors du calcul de la distance");
        }
      } else {
        console.warn("⚠️ Coordonnées manquantes pour le calcul Mapbox");
      }

      // Create course (client créé = besoin double acceptation)
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          client_id: clientData.id,
          driver_id: assignedDriverId,
          driver_ids: driverIds,
          pickup_address: pickupAddress,
          pickup_latitude: pickupCoordinates?.latitude || null,
          pickup_longitude: pickupCoordinates?.longitude || null,
          destination_address: destinationAddress,
          destination_latitude: destinationCoordinates?.latitude || null,
          destination_longitude: destinationCoordinates?.longitude || null,
          scheduled_date: new Date(scheduledDate).toISOString(),
          passengers_count: parseInt(passengersCount),
          distance_km: calculatedDistance,
          duration_minutes: calculatedDuration,
          notes: notes || null,
          promo_code: promoCode || null,
          status: "pending",
          created_by_user_id: user.id, // Client créateur
        })
        .select()
        .single();

      if (courseError) {
        console.error("Course creation error:", courseError);
        toast.error("Erreur lors de la création de la réservation");
        return;
      }

      console.log("Course created:", course);

      // Récupérer le user_id du chauffeur pour la notification
      const { data: driverData } = await supabase
        .from("drivers")
        .select("user_id")
        .eq("id", assignedDriverId)
        .single();

      // CORRECTION: Génération automatique du devis après création de course
      try {
        const { data: devisData, error: devisError } = await supabase.functions.invoke(
          'create-devis-auto',
          {
            body: {
              course_id: course.id,
              driver_id: assignedDriverId,
              use_hourly_rate: false, // Par défaut: facturation au km (TVA 10%)
            },
          }
        );

        if (devisError) {
          console.error("Devis auto-generation error:", devisError);
          toast.warning("Réservation créée mais erreur lors de la génération du devis");
        } else {
          console.log("Devis auto-generated:", devisData);
          
          // Notifier le chauffeur de la nouvelle demande de course
          if (driverData?.user_id) {
            await supabase.from("notifications").insert({
              user_id: driverData.user_id,
              title: "Nouvelle demande de course",
              message: `Vous avez reçu une nouvelle demande de course de ${pickupAddress} à ${destinationAddress}. Un devis a été généré automatiquement.`,
              type: "course_request",
              link: "/driver-dashboard?tab=courses"
            });
          }
          
          toast.success("Réservation et devis créés avec succès !");
        }
      } catch (devisGenError) {
        console.error("Devis generation exception:", devisGenError);
        toast.warning("Réservation créée, le devis sera généré ultérieurement");
      }
      
      // Redirect to client dashboard
      setTimeout(() => navigate("/client-dashboard"), 1500);

    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <Card className="p-8 bg-card border-primary/10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shadow-lg">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Nouvelle Réservation</h1>
              <p className="text-muted-foreground">Créez votre demande de course</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Adresses */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickup" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-premium" />
                  Adresse de départ *
                </Label>
                {clientAddress && (
                  <div className="flex items-center gap-2 mb-2 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="use-address-pickup"
                      checked={useAddressPickup}
                      onCheckedChange={(checked) => setUseAddressPickup(checked as boolean)}
                    />
                    <label htmlFor="use-address-pickup" className="text-sm cursor-pointer font-medium">
                      À partir de mon adresse
                    </label>
                  </div>
                )}
                <AddressAutocomplete
                  value={pickupAddress}
                  onChange={(address, coords) => {
                    setPickupAddress(address);
                    if (coords) setPickupCoordinates(coords);
                    setUseAddressPickup(false);
                  }}
                  placeholder="Commencez à taper : 123 Rue de la Paix, Paris..."
                  disabled={useAddressPickup}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-destructive" />
                  Adresse d'arrivée *
                </Label>
                {clientAddress && (
                  <div className="flex items-center gap-2 mb-2 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="use-address-destination"
                      checked={useAddressDestination}
                      onCheckedChange={(checked) => setUseAddressDestination(checked as boolean)}
                    />
                    <label htmlFor="use-address-destination" className="text-sm cursor-pointer font-medium">
                      Rentrer à mon adresse
                    </label>
                  </div>
                )}
                <AddressAutocomplete
                  value={destinationAddress}
                  onChange={(address, coords) => {
                    setDestinationAddress(address);
                    if (coords) setDestinationCoordinates(coords);
                    setUseAddressDestination(false);
                  }}
                  placeholder="Commencez à taper : 456 Avenue des Champs, Paris..."
                  disabled={useAddressDestination}
                />
              </div>
            </div>

            {/* Date et passagers */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date et heure *
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
                  max={maxPassengers}
                  value={passengersCount}
                  onChange={(e) => setPassengersCount(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Maximum {maxPassengers} passagers</p>
              </div>
            </div>

            {/* Code promo */}
            {availablePromos.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="promo" className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-success" />
                  Code promo disponible
                </Label>
                <Select value={promoCode} onValueChange={setPromoCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un code promo (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun code promo</SelectItem>
                    {availablePromos.map((promo) => (
                      <SelectItem key={promo.id} value={promo.code}>
                        {promo.code} - {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value}€`}
                        {promo.description && ` (${promo.description})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes complémentaires</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bagages volumineux, animaux, demandes particulières..."
                rows={4}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
              >
                {loading ? "Création..." : "Créer la réservation"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateCourse;
