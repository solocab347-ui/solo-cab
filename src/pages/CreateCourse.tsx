import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  MapPin, Calendar, Users, ArrowLeft, ArrowRight, Tag, CreditCard, Check, FileText,
  Loader2, Clock, Zap, CalendarClock, Car, Banknote
} from "lucide-react";
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
  const [scheduledTime, setScheduledTime] = useState("");
  const [passengersCount, setPassengersCount] = useState("1");
  const [maxPassengers, setMaxPassengers] = useState(4);
  const [notes, setNotes] = useState("");
  const [promoCode, setPromoCode] = useState("none");
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);
  const [clientAddress, setClientAddress] = useState("");
  const [useAddressPickup, setUseAddressPickup] = useState(false);
  const [useAddressDestination, setUseAddressDestination] = useState(false);
  const [paymentMethodPreference, setPaymentMethodPreference] = useState("cash");
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [createdCourseInfo, setCreatedCourseInfo] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState<'reservation' | 'immediate'>('reservation');

  // Fetch client address
  useEffect(() => {
    const fetchClientAddress = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("address")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.address) setClientAddress(data.address);
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
      geocodeAddress(clientAddress).then((result) => {
        if (result?.coordinates) setPickupCoordinates(result.coordinates);
      });
    }
  }, [useAddressPickup, clientAddress]);

  useEffect(() => {
    if (useAddressDestination && clientAddress) {
      setDestinationAddress(clientAddress);
      geocodeAddress(clientAddress).then((result) => {
        if (result?.coordinates) setDestinationCoordinates(result.coordinates);
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
    if (!pickupAddress.trim() || !destinationAddress.trim()) return false;
    if (!validateCoordinates(pickupCoordinates) || !validateCoordinates(destinationCoordinates)) return false;
    if (mode === 'reservation' && (!scheduledDate || !scheduledTime)) return false;
    return true;
  }, [pickupAddress, destinationAddress, pickupCoordinates, destinationCoordinates, mode, scheduledDate, scheduledTime]);

  const canGoToStep3 = useCallback(() => {
    return parseInt(passengersCount) >= 1;
  }, [passengersCount]);

  const getScheduledDateTime = () => {
    if (mode === 'immediate') {
      return new Date().toISOString();
    }
    if (scheduledDate && scheduledTime) {
      return `${scheduledDate}T${scheduledTime}`;
    }
    return scheduledDate;
  };

  const handleNext = () => {
    if (currentStep === 1 && !canGoToStep2()) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }
    if (currentStep === 2 && !canGoToStep3()) {
      toast.error("Veuillez remplir le nombre de passagers");
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
        scheduledDate: getScheduledDateTime(),
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
          scheduledDate: getScheduledDateTime(),
        });
        setShowInfoDialog(true);
      }
    } catch (error: any) {
      console.error("❌ Unexpected error:", error);
      toast.error("Une erreur inattendue est survenue");
    }
  };

  // Step indicator (same style as storefront)
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
                "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300",
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
                Étape {currentStep} sur {STEPS.length}
              </p>
            </div>
          </div>

          <StepIndicator />

          {/* ════════════════════════════════════════════ */}
          {/* Step 1: Trajet — storefront-style */}
          {/* ════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Mode Toggle */}
              <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border border-border/50">
                <button
                  onClick={() => setMode('immediate')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all",
                    mode === 'immediate'
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Zap className="h-4 w-4" />
                  Course immédiate
                </button>
                <button
                  onClick={() => setMode('reservation')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all",
                    mode === 'reservation'
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <CalendarClock className="h-4 w-4" />
                  Réservation
                </button>
              </div>

              {/* Address Card */}
              <Card className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  {/* Pickup */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                      <Label className="text-sm font-medium">Point de départ</Label>
                    </div>
                    {clientAddress && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <Checkbox
                          id="use-pickup"
                          checked={useAddressPickup}
                          onCheckedChange={(c) => setUseAddressPickup(c as boolean)}
                        />
                        <label htmlFor="use-pickup" className="text-xs cursor-pointer text-muted-foreground">
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
                      placeholder="Adresse de départ"
                      disabled={useAddressPickup}
                    />
                  </div>

                  {/* Divider */}
                  <div className="ml-1.5 w-0.5 h-4 bg-border" />

                  {/* Destination */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-destructive shrink-0" style={{ transform: 'rotate(45deg)' }} />
                      <Label className="text-sm font-medium">Point d'arrivée</Label>
                    </div>
                    {clientAddress && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <Checkbox
                          id="use-dest"
                          checked={useAddressDestination}
                          onCheckedChange={(c) => setUseAddressDestination(c as boolean)}
                        />
                        <label htmlFor="use-dest" className="text-xs cursor-pointer text-muted-foreground">
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
                      placeholder="Adresse de destination"
                      disabled={useAddressDestination}
                    />
                  </div>

                  {/* Date/Time for reservations */}
                  {mode === 'reservation' && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        Date et heure de prise en charge
                      </Label>
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Date</span>
                          <Input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="bg-primary/10 border border-primary/30 h-12 text-sm font-medium text-foreground"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Heure</span>
                          <Input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="bg-primary/10 border border-primary/30 h-12 text-sm font-medium text-foreground"
                          />
                        </div>
                      </div>
                      {(!scheduledDate || !scheduledTime) && (
                        <p className="text-[11px] text-amber-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Veuillez sélectionner la date et l'heure pour continuer
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button
                className="w-full h-12 text-base font-semibold gap-2"
                onClick={handleNext}
                disabled={!canGoToStep2()}
              >
                Continuer
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* ════════════════════════════════════════════ */}
          {/* Step 2: Détails */}
          {/* ════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <Card className="border-border/50">
                <CardContent className="p-4 space-y-5">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-base">Détails de la course</h2>
                  </div>

                  {/* Passengers */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Nombre de passagers
                    </Label>
                    <div className="flex items-center gap-3">
                      {[1, 2, 3, 4].filter(n => n <= maxPassengers).map(n => (
                        <button
                          key={n}
                          onClick={() => setPassengersCount(String(n))}
                          className={cn(
                            "w-12 h-12 rounded-xl font-semibold text-base transition-all",
                            parseInt(passengersCount) === n
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border/50"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Capacité maximale : {maxPassengers} personne(s)
                    </p>
                  </div>

                  {/* Payment method */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      Mode de paiement
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPaymentMethodPreference("cash")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium",
                          paymentMethodPreference === "cash"
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Banknote className="w-4 h-4" />
                        Espèces
                      </button>
                      <button
                        onClick={() => setPaymentMethodPreference("card")}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium",
                          paymentMethodPreference === "card"
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <CreditCard className="w-4 h-4" />
                        Carte
                      </button>
                    </div>
                  </div>

                  {/* Promo */}
                  <ErrorBoundary fallback={null}>
                    {availablePromos.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Tag className="w-4 h-4 text-green-500" />
                          Code promo
                        </Label>
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
                      </div>
                    )}
                  </ErrorBoundary>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Notes (optionnel)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Bagages, animaux, demandes particulières..."
                      rows={2}
                      className="bg-muted/30 border-border/50"
                    />
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full h-12 text-base font-semibold gap-2"
                onClick={handleNext}
                disabled={!canGoToStep3()}
              >
                Continuer
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* ════════════════════════════════════════════ */}
          {/* Step 3: Confirmation */}
          {/* ════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Summary */}
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Récapitulatif
                  </h2>

                  <div className="space-y-3">
                    {/* Route */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Départ</p>
                        <p className="text-sm font-medium truncate">{pickupAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="w-2.5 h-2.5 rounded-sm bg-destructive mt-1.5 shrink-0" style={{ transform: 'rotate(45deg)' }} />
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Arrivée</p>
                        <p className="text-sm font-medium truncate">{destinationAddress}</p>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <Calendar className="h-4 w-4 mx-auto mb-1 text-primary" />
                        <p className="text-[11px] text-muted-foreground">Date</p>
                        <p className="text-xs font-semibold">
                          {mode === 'immediate' ? 'Maintenant' : (
                            scheduledDate ? new Date(`${scheduledDate}T${scheduledTime || '00:00'}`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '-'
                          )}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
                        <p className="text-[11px] text-muted-foreground">Heure</p>
                        <p className="text-xs font-semibold">
                          {mode === 'immediate' ? 'ASAP' : (scheduledTime || '-')}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 text-center">
                        <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                        <p className="text-[11px] text-muted-foreground">Passagers</p>
                        <p className="text-xs font-semibold">{passengersCount}</p>
                      </div>
                    </div>

                    {/* Payment & Driver */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        {paymentMethodPreference === 'card' ? (
                          <CreditCard className="h-4 w-4 text-primary" />
                        ) : (
                          <Banknote className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-sm">{paymentMethodPreference === 'card' ? 'Carte bancaire' : 'Espèces'}</span>
                      </div>
                      {driverName && (
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{driverName}</span>
                        </div>
                      )}
                    </div>

                    {notes && (
                      <div className="p-3 rounded-lg bg-muted/30">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm">{notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

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
          )}
        </div>
      </div>

      <CourseCreatedInfoDialog
        open={showInfoDialog}
        onClose={() => {
          setShowInfoDialog(false);
          navigate("/client-dashboard?tab=courses");
        }}
        pickupAddress={createdCourseInfo?.pickupAddress}
        destinationAddress={createdCourseInfo?.destinationAddress}
        scheduledDate={createdCourseInfo?.scheduledDate}
      />
    </ErrorBoundary>
  );
};

export default CreateCourse;
