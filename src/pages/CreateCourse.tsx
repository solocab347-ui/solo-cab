import { useState, useEffect, useCallback } from "react";
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
import { Car, MapPin, Calendar, Users, ArrowLeft, ArrowRight, Tag, CreditCard, Check, FileText, Banknote, Shield, Loader2 } from "lucide-react";
import { geocodeAddress } from "@/lib/geocoding";
import { useCourseCreation } from "@/hooks/useCourseCreation";
import { validateCoordinates } from "@/lib/courseValidation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { sanitizeAddress, sanitizeString, sanitizeInteger } from "@/lib/inputSanitizer";
import { CourseCreatedInfoDialog } from "@/components/client/CourseCreatedInfoDialog";
import { CoursePaymentMethodSelector } from "@/components/shared/CoursePaymentMethodSelector";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: MapPin, label: "Trajet" },
  { icon: Calendar, label: "Détails" },
  { icon: CreditCard, label: "Confirmer" },
];

const CreateCourse = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createCourse, loading } = useCourseCreation();

  const driverId = searchParams.get("driver_id");
  const [driverName, setDriverName] = useState<string | null>(null);
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
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [paymentMethodPreference, setPaymentMethodPreference] = useState("cash");
  const [createdCourseInfo, setCreatedCourseInfo] = useState<{
    pickupAddress: string;
    destinationAddress: string;
    scheduledDate: string;
  } | null>(null);

  // Wizard step
  const [currentStep, setCurrentStep] = useState(1);

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
        if (!error && profileData?.address) {
          setClientAddress(profileData.address);
        }
      } catch (err) {
        console.error("Error fetching client address:", err);
      }
    };
    fetchClientAddress();
  }, [user]);

  // Auto-fill pickup when checkbox is used
  useEffect(() => {
    if (useAddressPickup && clientAddress) {
      setPickupAddress(clientAddress);
      geocodeAddress(clientAddress).then((coords) => {
        if (coords) setPickupCoordinates(coords);
      });
    }
  }, [useAddressPickup, clientAddress]);

  useEffect(() => {
    if (useAddressDestination && clientAddress) {
      setDestinationAddress(clientAddress);
      geocodeAddress(clientAddress).then((coords) => {
        if (coords) setDestinationCoordinates(coords);
      });
    }
  }, [useAddressDestination, clientAddress]);

  // Fetch driver info
  useEffect(() => {
    const fetchDriverInfo = async () => {
      if (!driverId) return;
      const { data } = await supabase
        .from("drivers")
        .select("max_passengers, profiles:user_id(full_name)")
        .eq("id", driverId);
      if (data && data.length > 0) {
        const driver = data[0] as any;
        setMaxPassengers(driver.max_passengers || 4);
        setDriverName(driver.profiles?.full_name || null);
      }
    };
    fetchDriverInfo();
  }, [driverId]);

  // Fetch promos
  useEffect(() => {
    const fetchAvailablePromos = async () => {
      if (!user) return;
      try {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (clientData) {
          const { data: promoAssignments } = await supabase
            .from("promotion_assignments")
            .select("promotion_id, promotions(id, code, description, type, value, active, valid_until, max_uses, current_uses)")
            .eq("client_id", clientData.id);
          if (promoAssignments) {
            const validPromos = promoAssignments
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
        }
      } catch (error) {
        console.error("Error fetching promos:", error);
      }
    };
    fetchAvailablePromos();
  }, [user]);

  const canGoToStep2 = useCallback(() => {
    return pickupAddress.length > 3 && destinationAddress.length > 3 && 
      validateCoordinates(pickupCoordinates) && validateCoordinates(destinationCoordinates);
  }, [pickupAddress, destinationAddress, pickupCoordinates, destinationCoordinates]);

  const canGoToStep3 = useCallback(() => {
    return !!scheduledDate && parseInt(passengersCount) >= 1;
  }, [scheduledDate, passengersCount]);

  const handleNext = () => {
    if (currentStep === 1 && !canGoToStep2()) {
      toast.error("Veuillez sélectionner des adresses valides");
      return;
    }
    if (currentStep === 2 && !canGoToStep3()) {
      toast.error("Veuillez remplir la date et le nombre de passagers");
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    if (currentStep === 1) {
      navigate(-1);
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user || !driverId) {
      toast.error("Informations manquantes");
      return;
    }
    if (!validateCoordinates(pickupCoordinates) || !validateCoordinates(destinationCoordinates)) {
      toast.error("Adresses invalides");
      return;
    }
    if (!scheduledDate) {
      toast.error("Date requise");
      return;
    }

    try {
      const { data: clientData } = await supabase
        .from("clients")
        .select("id, driver_id, is_exclusive")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!clientData) {
        toast.error("Profil client introuvable");
        return;
      }

      let assignedDriverId = clientData.is_exclusive && clientData.driver_id 
        ? clientData.driver_id 
        : driverId;

      const sanitizedPickup = sanitizeAddress(pickupAddress);
      const sanitizedDestination = sanitizeAddress(destinationAddress);
      const sanitizedNotes = sanitizeString(notes);
      const sanitizedPassengers = sanitizeInteger(passengersCount, 1, maxPassengers).toString();
      const sanitizedPromoCode = promoCode !== "none" ? sanitizeString(promoCode) : undefined;

      const course = await createCourse({
        userId: user.id,
        clientId: clientData.id,
        driverId: assignedDriverId,
        pickupAddress: sanitizedPickup,
        pickupCoordinates,
        destinationAddress: sanitizedDestination,
        destinationCoordinates,
        scheduledDate,
        passengersCount: sanitizedPassengers,
        notes: sanitizedNotes,
        promoCode: sanitizedPromoCode,
        paymentMethodPreference: paymentMethodPreference !== "not_specified" ? paymentMethodPreference : undefined,
      });

      if (course && 'id' in course) {
        if (clientData.is_exclusive) {
          setTimeout(async () => {
            try {
              await new Promise(r => setTimeout(r, 2000));
              const { data: devisData } = await supabase
                .from("devis")
                .select("id")
                .eq("course_id", (course as any).id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              if (devisData?.id) {
                await supabase.rpc("accept_devis_safely", {
                  _client_user_id: user.id,
                  _devis_id: devisData.id,
                });
              }
            } catch (err) {
              console.error("Auto-accept devis failed:", err);
            }
          }, 500);
          toast.success("Demande envoyée à votre chauffeur !", {
            description: "Vous serez notifié dès qu'il accepte votre course.",
          });
          navigate("/client-dashboard");
          return;
        }
        setCreatedCourseInfo({
          pickupAddress: sanitizedPickup,
          destinationAddress: sanitizedDestination,
          scheduledDate,
        });
        setShowInfoDialog(true);
      }
    } catch (error: any) {
      console.error("❌ Unexpected error:", error);
      toast.error("Une erreur inattendue est survenue");
    }
  };

  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-between px-2 py-3">
      {STEPS.map((step, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        const Icon = step.icon;
        return (
          <div key={index} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                isDone && "bg-primary text-primary-foreground",
                isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110",
                !isActive && !isDone && "bg-muted text-muted-foreground"
              )}>
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="flex-1 mx-2 mb-5">
                <div className={cn(
                  "h-0.5 rounded-full transition-all duration-500",
                  isDone ? "bg-primary" : "bg-border"
                )} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-4 max-w-lg">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">
                {driverName ? `Réserver avec ${driverName}` : "Nouvelle Réservation"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {driverName ? "Votre chauffeur personnel" : "Créez votre demande"}
              </p>
            </div>
          </div>

          <StepIndicator />

          {/* Step 1: Trajet */}
          <div className={cn(
            "transition-all duration-300",
            currentStep === 1 ? "opacity-100 translate-x-0" : "hidden"
          )}>
            <Card className="p-5 space-y-5 bg-card/80 backdrop-blur border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-base">Itinéraire de la course</h2>
              </div>

              {/* Pickup */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  Point de départ
                </Label>
                {clientAddress && (
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg border border-border/50">
                    <Checkbox
                      id="use-pickup"
                      checked={useAddressPickup}
                      onCheckedChange={(c) => setUseAddressPickup(c as boolean)}
                    />
                    <label htmlFor="use-pickup" className="text-xs cursor-pointer">
                      Partir de mon adresse enregistrée
                    </label>
                  </div>
                )}
                <AddressAutocomplete
                  value={pickupAddress}
                  onChange={(address, coords) => {
                    setPickupAddress(address);
                    setPickupCoordinates(coords || null);
                    setUseAddressPickup(false);
                  }}
                  placeholder="Ex: 15 Rue de la Paix, 75002 Paris"
                  disabled={useAddressPickup}
                />
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                  Point d'arrivée
                </Label>
                {clientAddress && (
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg border border-border/50">
                    <Checkbox
                      id="use-dest"
                      checked={useAddressDestination}
                      onCheckedChange={(c) => setUseAddressDestination(c as boolean)}
                    />
                    <label htmlFor="use-dest" className="text-xs cursor-pointer">
                      Retourner à mon adresse enregistrée
                    </label>
                  </div>
                )}
                <AddressAutocomplete
                  value={destinationAddress}
                  onChange={(address, coords) => {
                    setDestinationAddress(address);
                    setDestinationCoordinates(coords || null);
                    setUseAddressDestination(false);
                  }}
                  placeholder="Ex: Aéroport Charles de Gaulle"
                  disabled={useAddressDestination}
                />
              </div>

              <Button
                type="button"
                onClick={handleNext}
                disabled={!canGoToStep2()}
                className="w-full h-12 text-base gap-2"
              >
                Continuer
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>
          </div>

          {/* Step 2: Détails */}
          <div className={cn(
            "transition-all duration-300",
            currentStep === 2 ? "opacity-100 translate-x-0" : "hidden"
          )}>
            <Card className="p-5 space-y-5 bg-card/80 backdrop-blur border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-base">Détails de la réservation</h2>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date et heure du départ *
                </Label>
                <Input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="h-12 bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Nombre de passagers *
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={maxPassengers}
                  value={passengersCount}
                  onChange={(e) => setPassengersCount(e.target.value)}
                  className="h-12 bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  Capacité maximale : {maxPassengers} personnes
                </p>
              </div>

              {/* Promo */}
              <ErrorBoundary fallback={null}>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="w-4 h-4 text-success" />
                    Code promo {availablePromos.length > 0 ? '' : '(Aucun)'}
                  </Label>
                  {availablePromos.length === 0 ? (
                    <Input value="Aucune promotion disponible" disabled className="bg-muted h-12" />
                  ) : (
                    <Select value={promoCode} onValueChange={setPromoCode}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Sélectionnez (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun code promo</SelectItem>
                        {availablePromos.map((promo) => (
                          <SelectItem key={`promo-${promo.id}`} value={promo.code || `promo-${promo.id}`}>
                            {promo.code} - {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value}€`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </ErrorBoundary>

              <Button
                type="button"
                onClick={handleNext}
                disabled={!canGoToStep3()}
                className="w-full h-12 text-base gap-2"
              >
                Continuer
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>
          </div>

          {/* Step 3: Confirmation */}
          <div className={cn(
            "transition-all duration-300",
            currentStep === 3 ? "opacity-100 translate-x-0" : "hidden"
          )}>
            <div className="space-y-4">
              {/* Récapitulatif */}
              <Card className="p-5 bg-card/80 backdrop-blur border-border/50">
                <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Récapitulatif
                </h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Départ</p>
                      <p className="text-sm font-medium truncate">{pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Arrivée</p>
                      <p className="text-sm font-medium truncate">{destinationAddress}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">
                        {scheduledDate ? new Date(scheduledDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground">Passagers</p>
                      <p className="text-sm font-medium">{passengersCount} personne(s)</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Paiement */}
              <Card className="p-5 bg-card/80 backdrop-blur border-border/50">
                <CoursePaymentMethodSelector
                  value={paymentMethodPreference}
                  onChange={setPaymentMethodPreference}
                  driverId={driverId || undefined}
                />
              </Card>

              {/* Notes */}
              <Card className="p-5 bg-card/80 backdrop-blur border-border/50">
                <Label className="text-sm font-medium mb-2 block">Notes complémentaires</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Bagages volumineux, animaux, demandes particulières..."
                  rows={3}
                  className="bg-background"
                />
              </Card>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-14 text-base font-semibold gap-2 shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {driverName ? `Réserver avec ${driverName}` : "Confirmer la réservation"}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground px-4">
                Vous recevrez un devis détaillé dès confirmation de votre chauffeur.
              </p>
            </div>
          </div>
        </div>
      </div>

      <CourseCreatedInfoDialog
        open={showInfoDialog}
        onClose={() => {
          setShowInfoDialog(false);
          navigate("/client-dashboard?tab=finances&subtab=devis");
        }}
        pickupAddress={createdCourseInfo?.pickupAddress}
        destinationAddress={createdCourseInfo?.destinationAddress}
        scheduledDate={createdCourseInfo?.scheduledDate}
      />
    </ErrorBoundary>
  );
};

export default CreateCourse;
