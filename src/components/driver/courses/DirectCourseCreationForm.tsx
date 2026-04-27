import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { 
  UserX, 
  MapPin, 
  Calendar, 
  Users, 
  Calculator, 
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  User,
  CheckCircle,
  Zap,
  Send,
  Loader2,
  Wallet,
  Copy,
  ExternalLink
} from "lucide-react";
import { calculateRoute } from "@/lib/geocoding";
import { useDirectCourseCreation } from "@/hooks/useDirectCourseCreation";
import { validateCoordinates } from "@/lib/courseValidation";
import { DriverPaymentMethodSelector } from "@/components/shared/DriverPaymentMethodSelector";

interface DirectCourseCreationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  /** Called after successful creation with the created course (used for chained sharing). When provided and returns true, the internal success screen is skipped. */
  onCreated?: (course: any) => void | boolean | Promise<void | boolean>;
  /** Hides the internal post-creation Stripe payment link screen (used when the parent takes over, e.g. chaining to share dialog). */
  skipPostCreationScreen?: boolean;
  /** Custom title shown in the form header. */
  title?: string;
  /** Custom subtitle shown in the form header. */
  subtitle?: string;
}

export const DirectCourseCreationForm = ({ onSuccess, onCancel, onCreated, skipPostCreationScreen, title, subtitle }: DirectCourseCreationFormProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createDirectCourse, loading: courseLoading } = useDirectCourseCreation();

  // Driver profile
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [maxPassengers, setMaxPassengers] = useState(4);

  // Post-creation state
  const [createdCourse, setCreatedCourse] = useState<any>(null);
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);
  const [paymentLinkGenerated, setPaymentLinkGenerated] = useState(false);
  const [driverHasStripeConnect, setDriverHasStripeConnect] = useState(false);

  // Client info (non inscrit)
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // Course type
  const [courseType, setCourseType] = useState<"classic" | "hourly">("classic");
  
  // Addresses
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCoordinates, setDestinationCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Booking details
  const [scheduledDate, setScheduledDate] = useState("");
  const [passengersCount, setPassengersCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  
  // Calculated values
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Price override mode: 'auto' uses the calculator, 'percentage' adds a % surcharge to the calculated price,
  // 'manual' lets the driver set any fixed amount (overrides everything).
  const [priceMode, setPriceMode] = useState<'auto' | 'percentage' | 'manual'>('auto');
  const [pricePercentage, setPricePercentage] = useState<string>('0'); // % surcharge applied to calculatedPrice
  const [manualPrice, setManualPrice] = useState<string>(''); // EUR

  // Final TTC price actually sent to the backend (respects override mode)
  const finalPrice = (() => {
    if (priceMode === 'manual') {
      const v = parseFloat(manualPrice);
      return isNaN(v) || v <= 0 ? null : parseFloat(v.toFixed(2));
    }
    if (priceMode === 'percentage' && calculatedPrice !== null) {
      const pct = parseFloat(pricePercentage) || 0;
      return parseFloat((calculatedPrice * (1 + pct / 100)).toFixed(2));
    }
    return calculatedPrice;
  })();
  useEffect(() => {
    if (courseType === "classic" && pickupCoordinates && destinationCoordinates && driverProfile) {
      calculateRouteData();
    }
  }, [pickupCoordinates, destinationCoordinates, courseType, driverProfile]);

  useEffect(() => {
    if (driverProfile && (distanceKm || durationHours)) {
      calculateEstimatedPrice();
    }
  }, [distanceKm, durationMinutes, durationHours, courseType, driverProfile, scheduledDate]);

  const fetchDriverProfile = async () => {
    if (!user) return;

    try {
      const { data: driver, error } = await supabase
        .from("drivers")
        .select("id, user_id, status, max_passengers, base_fare, per_km_rate, hourly_rate, tva_included, minimum_price, is_pioneer, free_access_end_date, created_at, billing_type, stripe_connect_account_id, stripe_connect_charges_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching driver profile:", error);
        toast.error("Erreur lors du chargement du profil");
        return;
      }

      if (driver) {
        setDriverProfile(driver);
        setMaxPassengers(driver.max_passengers || 4);
        // Check Stripe Connect availability
        setDriverHasStripeConnect(
          !!driver.stripe_connect_account_id && 
          driver.stripe_connect_charges_enabled === true
        );
      }
    } catch (err) {
      console.error("Exception fetching driver profile:", err);
    }
  };

  const calculateRouteData = async () => {
    if (!pickupCoordinates || !destinationCoordinates) return;

    setCalculating(true);
    try {
      const routeResult = await calculateRoute(pickupCoordinates, destinationCoordinates);
      
      if (routeResult.success && routeResult.distance_km && routeResult.duration_minutes) {
        setDistanceKm(routeResult.distance_km);
        setDurationMinutes(routeResult.duration_minutes);
      }
    } finally {
      setCalculating(false);
    }
  };

  const calculateEstimatedPrice = async () => {
    if (!driverProfile) return;

    setCalculating(true);
    
    try {
      // Utiliser le RPC calculate_course_price pour garantir la cohérence avec le backend
      const { data: priceResult, error } = await supabase.rpc('calculate_course_price', {
        _driver_id: driverProfile.id,
        _distance_km: courseType === "classic" ? (distanceKm || 0) : 0,
        _duration_minutes: courseType === "hourly" ? (parseFloat(durationHours || "0") * 60) : (durationMinutes || 0),
        _scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString(),
        _use_hourly_rate: courseType === "hourly"
      });

      if (error) {
        console.error("Error calculating price via RPC:", error);
        // Fallback au calcul local en cas d'erreur
        calculateLocalPrice();
        return;
      }

      if (priceResult && priceResult.length > 0) {
        const result = priceResult[0];
        setCalculatedPrice(parseFloat(result.total_price?.toFixed(2) || "0"));
      }
    } catch (err) {
      console.error("Exception calculating price:", err);
      calculateLocalPrice();
    } finally {
      setCalculating(false);
    }
  };

  // Calcul local en fallback uniquement
  const calculateLocalPrice = () => {
    if (!driverProfile) return;

    let estimatedPrice = 0;
    const minimumPrice = driverProfile.minimum_price || 0;

    if (courseType === "classic" && distanceKm !== null) {
      const baseFare = driverProfile.base_fare || 0;
      const perKmRate = driverProfile.per_km_rate || 0;
      const tvaRate = 10;
      
      let subtotal = 0;
      
      if (driverProfile.tva_included) {
        const baseFareHT = baseFare / (1 + tvaRate / 100);
        const perKmRateHT = perKmRate / (1 + tvaRate / 100);
        const subtotalHT = baseFareHT + (distanceKm * perKmRateHT);
        const tva = subtotalHT * (tvaRate / 100);
        subtotal = subtotalHT + tva;
      } else {
        const rawSubtotal = baseFare + (distanceKm * perKmRate);
        const tva = rawSubtotal * (tvaRate / 100);
        subtotal = rawSubtotal + tva;
      }
      
      if (minimumPrice > 0 && subtotal < minimumPrice) {
        estimatedPrice = minimumPrice;
      } else {
        estimatedPrice = subtotal;
      }
    } else if (courseType === "hourly" && durationHours) {
      const hourlyRate = driverProfile.hourly_rate || 0;
      const hours = parseFloat(durationHours);
      const tvaRate = 20;
      
      if (driverProfile.tva_included) {
        const timeHT = (hours * hourlyRate) / (1 + tvaRate / 100);
        const tva = timeHT * (tvaRate / 100);
        estimatedPrice = timeHT + tva;
      } else {
        const subtotal = hours * hourlyRate;
        const tva = subtotal * (tvaRate / 100);
        estimatedPrice = subtotal + tva;
      }
    }

    setCalculatedPrice(estimatedPrice > 0 ? parseFloat(estimatedPrice.toFixed(2)) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !driverProfile) {
      toast.error("Erreur de profil chauffeur");
      return;
    }

    if (!guestName.trim() || !guestPhone.trim()) {
      toast.error("Veuillez renseigner le nom et le téléphone du client");
      return;
    }

    if (!validateCoordinates(pickupCoordinates) || !validateCoordinates(destinationCoordinates)) {
      toast.error("Veuillez sélectionner des adresses valides");
      return;
    }

    if (!scheduledDate) {
      toast.error("Veuillez sélectionner une date");
      return;
    }

    if (courseType === "hourly" && !durationHours) {
      toast.error("Veuillez indiquer la durée en heures");
      return;
    }

    if (courseType === "classic" && (!distanceKm || !durationMinutes)) {
      toast.error("Impossible de créer la course sans calcul de distance");
      return;
    }

    const course = await createDirectCourse({
      driverId: driverProfile.id,
      guestName: guestName.trim(),
      guestPhone: guestPhone.trim(),
      guestEmail: guestEmail.trim() || undefined,
      pickupAddress,
      pickupCoordinates,
      destinationAddress,
      destinationCoordinates,
      scheduledDate,
      passengersCount: parseInt(passengersCount),
      notes: notes.trim() || undefined,
      estimatedPrice: calculatedPrice || undefined,
      courseType,
      durationHours: durationHours ? parseFloat(durationHours) : undefined,
      paymentMethod: paymentMethod !== "not_specified" ? paymentMethod : undefined,
    });

    if (course) {
      toast.success("Course confirmée créée avec succès !");
      setCreatedCourse(course);
      // If driver has Stripe Connect, show payment link option instead of navigating away
      if (!driverHasStripeConnect) {
        onSuccess?.();
      }
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!createdCourse) return;
    setPaymentLinkLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-request', {
        body: {
          course_id: createdCourse.id,
          client_email: guestEmail || undefined,
          client_name: guestName,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.checkout_url) {
        await navigator.clipboard.writeText(data.checkout_url);
        toast.success('Lien de paiement copié ! Envoyez-le au client par SMS ou WhatsApp.');
        setPaymentLinkGenerated(true);
      }
    } catch (err: any) {
      console.error('Error generating payment link:', err);
      toast.error(err.message || 'Erreur lors de la création du lien de paiement');
    } finally {
      setPaymentLinkLoading(false);
    }
  };

  // Show success screen with payment link option
  if (createdCourse && driverHasStripeConnect) {
    return (
      <Card className="p-6 bg-card border-primary/10">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Course créée avec succès !</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {guestName} — {calculatedPrice?.toFixed(2)}€
            </p>
          </div>

          {/* Stripe payment link section */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <Wallet className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Envoyer un lien de paiement CB</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Générez un lien de paiement sécurisé et envoyez-le au client par SMS ou WhatsApp.
            </p>

            {paymentLinkGenerated ? (
              <Alert className="bg-green-500/10 border-green-500/30">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Lien copié ! Envoyez-le au client par SMS ou WhatsApp.
                </AlertDescription>
              </Alert>
            ) : (
              <Button
                onClick={handleGeneratePaymentLink}
                disabled={paymentLinkLoading}
                className="w-full"
              >
                {paymentLinkLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création du lien...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Créer lien de paiement ({calculatedPrice?.toFixed(2)}€)
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onSuccess?.()}
              className="flex-1"
            >
              Retour au tableau de bord
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-primary/10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
          <UserX className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Course pour Client Non Inscrit</h2>
          <p className="text-sm text-muted-foreground">Création directe sans devis</p>
        </div>
      </div>

      {/* Avertissement important */}
      <Alert className="mb-6 border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <AlertTitle className="text-amber-600 font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Course Confirmée Directement
        </AlertTitle>
        <AlertDescription className="text-amber-600/90 mt-1">
          Cette course sera <strong>acceptée immédiatement</strong> sans passer par l'acceptation d'un devis. 
          Elle apparaîtra directement dans vos "Courses acceptées" et pourra être partagée avec vos partenaires.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations client */}
        <div className="bg-card/50 p-6 rounded-lg border border-border space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-primary" />
            Informations du client
            <Badge variant="secondary" className="ml-2">Non inscrit</Badge>
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guestName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Nom du client *
              </Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Jean Dupont"
                required
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestPhone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Téléphone *
              </Label>
              <Input
                id="guestPhone"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                required
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guestEmail" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email (optionnel)
            </Label>
            <Input
              id="guestEmail"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="client@email.com"
              className="bg-background"
            />
          </div>
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
        <div className="bg-card/50 p-6 rounded-lg border border-border space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5 text-primary" />
            Itinéraire
          </h3>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-500" />
              Point de départ *
            </Label>
            <AddressAutocomplete
              value={pickupAddress}
              onChange={(address, coords) => {
                setPickupAddress(address);
                if (coords) setPickupCoordinates(coords);
              }}
              placeholder="Ex: 15 Rue de la Paix, 75002 Paris"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" />
              Point d'arrivée *
            </Label>
            <AddressAutocomplete
              value={destinationAddress}
              onChange={(address, coords) => {
                setDestinationAddress(address);
                if (coords) setDestinationCoordinates(coords);
              }}
              placeholder="Ex: Aéroport CDG, Roissy"
            />
          </div>
        </div>

        {/* Calculs automatiques */}
        {courseType === "classic" && distanceKm !== null && (
          <Card className="p-4 bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Distance</p>
                <p className="text-2xl font-bold">{distanceKm} km</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Durée</p>
                <p className="text-2xl font-bold">{durationMinutes} min</p>
              </div>
            </div>
          </Card>
        )}

        {/* Durée pour mise à disposition */}
        {courseType === "hourly" && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Durée (heures) *
            </Label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              placeholder="2.5"
              required={courseType === "hourly"}
            />
          </div>
        )}

        {/* Prix estimé */}
        {calculatedPrice !== null && (
          <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Prix estimé TTC</p>
                <p className="text-xs text-muted-foreground">
                  {courseType === "classic" ? "TVA 10%" : "TVA 20%"}
                </p>
              </div>
              <p className="text-3xl font-bold text-primary">{calculatedPrice}€</p>
            </div>
          </Card>
        )}

        {/* Date et passagers */}
        <div className="bg-card/50 p-6 rounded-lg border border-border space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Détails de la réservation
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date et heure *
              </Label>
              <Input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Passagers *
              </Label>
              <Input
                type="number"
                min="1"
                max={maxPassengers}
                value={passengersCount}
                onChange={(e) => setPassengersCount(e.target.value)}
                required
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">Max: {maxPassengers}</p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        {driverProfile?.id && (
          <div className="bg-card/50 p-6 rounded-lg border border-border">
            <DriverPaymentMethodSelector
              driverId={driverProfile.id}
              value={paymentMethod}
              onChange={setPaymentMethod}
              label="Moyen de paiement prévu"
              showNotSpecified={true}
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes complémentaires</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bagages, demandes particulières..."
            rows={3}
          />
        </div>

        {/* Boutons */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel || (() => navigate("/driver-dashboard"))}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={courseLoading || calculating}
            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
          >
            {courseLoading ? "Création..." : calculating ? "Calcul..." : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmer la course
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
};
