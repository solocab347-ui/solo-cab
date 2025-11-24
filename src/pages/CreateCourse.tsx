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
import { NavigationHeader } from "@/components/NavigationHeader";
import { Car, MapPin, Calendar, Users, ArrowLeft, Tag } from "lucide-react";
import { geocodeAddress } from "@/lib/geocoding";
import { useCourseCreation } from "@/hooks/useCourseCreation";
import { validateCoordinates } from "@/lib/courseValidation";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const CreateCourse = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createCourse, loading } = useCourseCreation();

  const driverId = searchParams.get("driver_id");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [passengersCount, setPassengersCount] = useState("1");
  const [maxPassengers, setMaxPassengers] = useState(4);
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("none");
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);
  const [clientAddress, setClientAddress] = useState("");
  const [useAddressPickup, setUseAddressPickup] = useState(false);
  const [useAddressDestination, setUseAddressDestination] = useState(false);

  // Fetch client address on mount
  useEffect(() => {
    const fetchClientAddress = async () => {
      if (!user) return;

      try {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("address")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("❌ Error fetching profile address:", error);
          return;
        }

        if (profileData?.address) {
          setClientAddress(profileData.address);
        }
      } catch (err) {
        console.error("❌ Exception fetching profile address:", err);
      }
    };

    fetchClientAddress();
  }, [user]);

  // SYSTÈME RENFORCÉ: Utilisation du geocoding centralisé avec gestion d'erreurs
  useEffect(() => {
    const applyPickupAddress = async () => {
      if (useAddressPickup && clientAddress) {
        setPickupAddress(clientAddress);
        try {
          const result = await geocodeAddress(clientAddress);
          if (result.success && result.coordinates) {
            setPickupCoordinates(result.coordinates);
          } else {
            console.warn("⚠️ Geocoding failed for pickup address:", result.error);
            toast.warning("Impossible de géolocaliser l'adresse de départ");
          }
        } catch (error) {
          console.error("❌ Geocoding exception for pickup:", error);
          toast.error("Erreur de géolocalisation");
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
        try {
          const result = await geocodeAddress(clientAddress);
          if (result.success && result.coordinates) {
            setDestinationCoordinates(result.coordinates);
          } else {
            console.warn("⚠️ Geocoding failed for destination address:", result.error);
            toast.warning("Impossible de géolocaliser l'adresse d'arrivée");
          }
        } catch (error) {
          console.error("❌ Geocoding exception for destination:", error);
          toast.error("Erreur de géolocalisation");
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
      
      try {
        const { data: driverData, error } = await supabase
          .from("drivers")
          .select("max_passengers")
          .eq("id", driverId)
          .maybeSingle();
        
        if (error) {
          console.error("❌ Error fetching driver max passengers:", error);
          return;
        }
        
        if (driverData && driverData.max_passengers) {
          setMaxPassengers(driverData.max_passengers);
        }
      } catch (err) {
        console.error("❌ Exception fetching driver max passengers:", err);
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

    if (!user || !driverId) {
      toast.error("Informations manquantes pour créer la course");
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

      // Déterminer le driver assigné
      let assignedDriverId: string;
      if (clientData.is_exclusive && clientData.driver_id) {
        assignedDriverId = clientData.driver_id;
      } else if (driverId) {
        assignedDriverId = driverId;
      } else {
        toast.error("Aucun chauffeur sélectionné");
        return;
      }

      // Utiliser le hook sécurisé pour créer la course
      const course = await createCourse({
        userId: user.id,
        clientId: clientData.id,
        driverId: assignedDriverId,
        pickupAddress,
        pickupCoordinates,
        destinationAddress,
        destinationCoordinates,
        scheduledDate,
        passengersCount,
        notes,
        promoCode,
      });

      if (course) {
        // Notifier le chauffeur
        const { data: driverData } = await supabase
          .from("drivers")
          .select("user_id")
          .eq("id", assignedDriverId)
          .maybeSingle();

        if (driverData?.user_id) {
          await supabase.from("notifications").insert({
            user_id: driverData.user_id,
            title: "Nouvelle demande de course",
            message: `Nouvelle demande de ${pickupAddress} à ${destinationAddress}`,
            type: "course_request",
            link: "/driver-dashboard?tab=courses",
          });
        }

        // Notifier le client
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: "Devis généré",
          message: "Votre devis a été généré. Consultez-le dans 'Devis et Factures'",
          type: "info",
          link: "/client-dashboard?tab=devis",
        });

        toast.info("Consultez votre devis dans 'Devis et Factures'", { duration: 5000 });
        setTimeout(() => navigate("/client-dashboard"), 1500);
      }
    } catch (error: any) {
      console.error("❌ Unexpected error:", error);
      toast.error("Une erreur inattendue est survenue");
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
        <NavigationHeader 
          showBack={true}
          showHome={true}
          homeRoute="/client-dashboard"
        />

        <Card className="p-8 bg-card border-primary/10 mt-6">
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
            <ErrorBoundary fallback={
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-success" />
                  Code promo
                </Label>
                <Input 
                  value="Aucune promotion disponible" 
                  disabled 
                  className="bg-muted"
                />
              </div>
            }>
              <div className="space-y-2">
                <Label htmlFor="promo" className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-success" />
                  Code promo {availablePromos.length > 0 ? 'disponible' : '(Aucun disponible)'}
                </Label>
                {availablePromos.length === 0 ? (
                  <Input 
                    value="Aucune promotion disponible" 
                    disabled 
                    className="bg-muted"
                  />
                ) : (
                  <Select 
                    value={promoCode} 
                    onValueChange={setPromoCode}
                    key={`promo-select-${availablePromos.length}`}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un code promo (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun code promo</SelectItem>
                      {availablePromos.map((promo) => (
                        <SelectItem 
                          key={`promo-${promo.id}`} 
                          value={promo.code || `promo-${promo.id}`}
                        >
                          {promo.code} - {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value}€`}
                          {promo.description && ` (${promo.description})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </ErrorBoundary>

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
            
            {/* Message d'information */}
            <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-center text-muted-foreground">
                ℹ️ Une fois que vous aurez réservé, vous recevrez instantanément un devis.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default CreateCourse;
