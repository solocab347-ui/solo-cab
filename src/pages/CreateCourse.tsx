import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);

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
          distance_km: distanceKm ? parseFloat(distanceKm) : null,
          duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
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

        <Card className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-premium rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-premium-foreground" />
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
                <AddressAutocomplete
                  value={pickupAddress}
                  onChange={(address, coords) => {
                    setPickupAddress(address);
                    if (coords) setPickupCoordinates(coords);
                  }}
                  placeholder="Commencez à taper : 123 Rue de la Paix, Paris..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-destructive" />
                  Adresse d'arrivée *
                </Label>
                <AddressAutocomplete
                  value={destinationAddress}
                  onChange={(address, coords) => {
                    setDestinationAddress(address);
                    if (coords) setDestinationCoordinates(coords);
                  }}
                  placeholder="Commencez à taper : 456 Avenue des Champs, Paris..."
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

            {/* Distance et durée (optionnels) */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="distance">Distance estimée (km)</Label>
                <Input
                  id="distance"
                  type="number"
                  step="0.1"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                  placeholder="15.5"
                />
                <p className="text-xs text-muted-foreground">Optionnel - pour estimation du prix</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Durée estimée (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">Optionnel - pour estimation du prix</p>
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
                className="flex-1 bg-gradient-premium"
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
