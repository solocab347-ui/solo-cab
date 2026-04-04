import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Calendar, Clock, MapPin, User, Phone, Mail, Car, AlertTriangle, UserPlus, Euro, CreditCard, Banknote } from "lucide-react";
import { calculateRoute } from "@/lib/geocoding";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logo from "@/assets/logo-solocab.png";
import { useSubmitProtection, generateSubmitKey } from "@/hooks/useSubmitProtection";
import { withRetry } from "@/lib/asyncUtils";
import { handleError } from "@/lib/errorHandler";
import { GuestReservationWithCardHold } from "@/components/payment/GuestReservationWithCardHold";

interface DriverInfo {
  id: string;
  company_name: string | null;
  display_driver_name: boolean;
  display_company_name: boolean;
  base_fare: number | null;
  per_km_rate: number | null;
  minimum_price: number | null;
  card_photo_url: string | null;
  full_name: string | null;
  profile_photo_url: string | null;
}

const GuestBooking = () => {
  const { driverId } = useParams<{ driverId: string }>();
  const [searchParams] = useSearchParams();
  const qrCodeId = searchParams.get('qr');
  const navigate = useNavigate();
  
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // PROTECTION ANTI-DOUBLE-SUBMIT via hook centralisé
  const { isSubmitting: submitting, protectedSubmit } = useSubmitProtection();
  
  // Form fields
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCoords, setDestinationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [passengersCount, setPassengersCount] = useState(1);
  const [notes, setNotes] = useState("");
  
  // Handlers for address changes - clear coords when user types manually
  const handlePickupChange = (address: string, coords?: { latitude: number; longitude: number }) => {
    setPickupAddress(address);
    if (coords) {
      setPickupCoords(coords);
    } else {
      // User is typing manually, invalidate previous coordinates
      setPickupCoords(null);
    }
  };
  
  const handleDestinationChange = (address: string, coords?: { latitude: number; longitude: number }) => {
    setDestinationAddress(address);
    if (coords) {
      setDestinationCoords(coords);
    } else {
      // User is typing manually, invalidate previous coordinates
      setDestinationCoords(null);
    }
  };
  
  // Price estimation
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);
  
  // Card hold flow state
  const [showCardHoldFlow, setShowCardHoldFlow] = useState(false);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [createdTrackingToken, setCreatedTrackingToken] = useState<string | null>(null);
  const [requiresCardHold, setRequiresCardHold] = useState(false);

  useEffect(() => {
    const fetchDriver = async () => {
      if (!driverId) return;
      
      try {
        // D'abord essayer get_safe_public_driver_data (pour chauffeurs validés)
        let d = null;
        const { data: driverData, error } = await supabase
          .rpc('get_safe_public_driver_data', { driver_id_param: driverId });
        
        if (!error && driverData && driverData.length > 0) {
          d = driverData[0];
        } else {
          // Fallback: chercher directement dans la table drivers
          const { data: directDriver, error: directError } = await supabase
            .from('drivers')
            .select('id, company_name, display_driver_name, display_company_name, card_photo_url, user_id, public_profile_enabled')
            .eq('id', driverId)
            .maybeSingle();
          
          if (directError || !directDriver) {
            toast.error("Chauffeur non trouvé");
            navigate('/chauffeurs');
            return;
          }
          
          // SIMPLIFICATION: Tout chauffeur avec public_profile_enabled = true est accessible
          if (!directDriver.public_profile_enabled) {
            toast.error("Ce chauffeur n'accepte pas de réservations");
            navigate('/chauffeurs');
            return;
          }
          
          d = directDriver;
        }
        
        // Fetch profile info
        const { data: profileData } = await supabase
          .rpc('get_public_profile_info', { user_id_param: d.user_id });

        // Fetch pricing info (we need this from drivers table)
        const { data: pricingData } = await supabase
          .from('drivers')
          .select('base_fare, per_km_rate, minimum_price')
          .eq('id', driverId)
          .single();

        setDriver({
          id: d.id,
          company_name: d.company_name,
          display_driver_name: d.display_driver_name,
          display_company_name: d.display_company_name,
          base_fare: pricingData?.base_fare || 0,
          per_km_rate: pricingData?.per_km_rate || 0,
          minimum_price: pricingData?.minimum_price || 0,
          card_photo_url: d.card_photo_url,
          full_name: profileData?.[0]?.full_name || null,
          profile_photo_url: profileData?.[0]?.profile_photo_url || null
        });
      } catch (error) {
        console.error("Error fetching driver:", error);
        toast.error("Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchDriver();
  }, [driverId, navigate]);

  // Calculate price when addresses change - using RPC for proper surcharge calculation
  useEffect(() => {
    const calculatePrice = async () => {
      if (!pickupCoords || !destinationCoords || !driver || !scheduledDate) return;
      
      setCalculating(true);
      try {
        const route = await calculateRoute(pickupCoords, destinationCoords);
        if (route && route.success) {
          setDistance(route.distance_km);
          setDuration(route.duration_minutes);
          
          // Use RPC to calculate price with all surcharges (evening, weekend, airport, peak hours)
          const { data: priceData, error: priceError } = await supabase
            .rpc('calculate_course_price', {
              _driver_id: driver.id,
              _distance_km: route.distance_km,
              _duration_minutes: route.duration_minutes,
              _use_hourly_rate: false,
              _scheduled_date: new Date(scheduledDate).toISOString(),
              _pickup_address: pickupAddress || null,
              _destination_address: destinationAddress || null,
            });

          if (priceError || !priceData || priceData.length === 0) {
            console.error("Price calculation error:", priceError);
            // Fallback to simple calculation
            const baseFare = driver.base_fare || 0;
            const perKmRate = driver.per_km_rate || 0;
            const minimumPrice = driver.minimum_price || 0;
            let price = baseFare + (route.distance_km * perKmRate);
            if (minimumPrice > 0 && price < minimumPrice) {
              price = minimumPrice;
            }
            setEstimatedPrice(Math.round(price * 100) / 100);
          } else {
            // Use the properly calculated price with all surcharges
            setEstimatedPrice(Math.round(priceData[0].total_price * 100) / 100);
          }
        }
      } catch (error) {
        console.error("Error calculating route:", error);
      } finally {
        setCalculating(false);
      }
    };

    calculatePrice();
  }, [pickupCoords, destinationCoords, driver, scheduledDate, pickupAddress, destinationAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!driver || !pickupCoords || !destinationCoords || !scheduledDate) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      toast.error("Veuillez fournir vos coordonnées");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      toast.error("Veuillez fournir une adresse email valide");
      return;
    }

    // Phone validation (basic)
    const phoneRegex = /^[+]?[\d\s-]{8,}$/;
    if (!phoneRegex.test(guestPhone)) {
      toast.error("Veuillez fournir un numéro de téléphone valide");
      return;
    }

    // Utiliser le hook de protection centralisé
    await protectedSubmit(async () => {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          driver_id: driver.id,
          driver_ids: [driver.id],
          pickup_address: pickupAddress,
          pickup_latitude: pickupCoords.latitude,
          pickup_longitude: pickupCoords.longitude,
          destination_address: destinationAddress,
          destination_latitude: destinationCoords.latitude,
          destination_longitude: destinationCoords.longitude,
          scheduled_date: new Date(scheduledDate).toISOString(),
          passengers_count: passengersCount,
          notes: notes || null,
          status: 'pending',
          distance_km: distance,
          duration_minutes: duration,
          is_guest_booking: true,
          guest_name: guestName.trim(),
          guest_email: guestEmail.trim().toLowerCase(),
          guest_phone: guestPhone.trim(),
          guest_estimated_price: estimatedPrice
        })
        .select('id, guest_tracking_token')
        .single();

      if (error) throw error;

      // Générer automatiquement le devis avec retry
      console.log('🔄 Génération automatique du devis pour guest booking...');
      await withRetry(
        async () => {
          const result = await supabase.functions.invoke('create-devis-auto', {
            body: {
              course_id: data.id,
              driver_id: driver.id
            }
          });
          if (result.error) throw result.error;
          return result;
        },
        { maxRetries: 3, context: 'Création devis guest booking' }
      ).then(() => {
        console.log('✅ Devis généré avec succès (en attente de validation chauffeur)');
      }).catch((devisError) => {
        console.error('⚠️ Erreur génération devis (non bloquant):', devisError);
      });

      // Envoyer l'email de suivi au client (non bloquant)
      supabase.functions.invoke('send-guest-tracking-email', {
        body: { course_id: data.id }
      }).then(() => {
        console.log('✅ Email de suivi envoyé au client');
      }).catch((emailError) => {
        console.error('⚠️ Erreur envoi email suivi (non bloquant):', emailError);
      });

      // Check if driver requires card hold (uses Stripe Connect)
      const { data: driverPayment } = await supabase
        .from('drivers')
        .select('billing_type, stripe_connect_account_id, stripe_connect_charges_enabled')
        .eq('id', driver.id)
        .single();

      const driverUsesStripe = 
        !!driverPayment?.stripe_connect_account_id &&
        driverPayment?.stripe_connect_charges_enabled === true;

      if (driverUsesStripe) {
        // Show card hold flow
        setCreatedCourseId(data.id);
        setCreatedTrackingToken(data.guest_tracking_token);
        setRequiresCardHold(true);
        setShowCardHoldFlow(true);
        toast.info("Veuillez valider votre empreinte bancaire pour confirmer la réservation");
      } else {
        // No card hold required, go directly to tracking
        toast.success("Demande de réservation envoyée !");
        navigate(`/reservation-suivi/${data.guest_tracking_token}`);
      }
      
      return data;
    }).catch((error) => {
      handleError(error, "Création réservation invité");
    });
  };

  const handleCardHoldComplete = () => {
    if (createdTrackingToken) {
      navigate(`/reservation-suivi/${createdTrackingToken}`);
    }
  };

  const getDriverDisplayName = () => {
    if (driver?.display_company_name && driver.company_name) {
      return driver.company_name;
    }
    if (driver?.display_driver_name && driver.full_name) {
      return driver.full_name;
    }
    return "Chauffeur VTC";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  // Show card hold flow if required
  if (showCardHoldFlow && createdCourseId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <NavigationHeader />
        <div className="container max-w-2xl mx-auto px-4 py-8">
          {/* Driver Info Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  {driver.profile_photo_url || driver.card_photo_url ? (
                    <img 
                      src={driver.profile_photo_url || driver.card_photo_url || ''} 
                      alt={getDriverDisplayName()}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{getDriverDisplayName()}</h2>
                  <p className="text-muted-foreground">Confirmation de réservation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Hold Flow */}
          <GuestReservationWithCardHold
            driverId={driver.id}
            courseId={createdCourseId}
            clientEmail={guestEmail}
            clientName={guestName}
            estimatedAmount={estimatedPrice || 0}
            trackingToken={createdTrackingToken || ""}
            onComplete={handleCardHoldComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <NavigationHeader />
      
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Driver Info Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                {driver.profile_photo_url || driver.card_photo_url ? (
                  <img 
                    src={driver.profile_photo_url || driver.card_photo_url || ''} 
                    alt={getDriverDisplayName()}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Car className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{getDriverDisplayName()}</h2>
                <p className="text-muted-foreground">Réservation rapide sans inscription</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Encouragement */}
        <Alert className="mb-6 border-primary/50 bg-primary/5">
          <UserPlus className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span>Pour profiter de tous les avantages, inscrivez-vous gratuitement !</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(qrCodeId ? `/inscription-client?qr=${qrCodeId}` : `/inscription-chauffeur/${driverId}`)}
              className="whitespace-nowrap"
            >
              S'inscrire
            </Button>
          </AlertDescription>
        </Alert>

        {/* Booking Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Réserver une course
            </CardTitle>
            <CardDescription>
              Remplissez le formulaire pour demander une réservation. Le chauffeur vous contactera pour confirmer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Vos coordonnées
                </h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="guestName">Prénom *</Label>
                    <Input
                      id="guestName"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Votre prénom"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="guestPhone" className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Téléphone *
                    </Label>
                    <Input
                      id="guestPhone"
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+33 6 12 34 56 78"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guestEmail" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email *
                  </Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>

              {/* Trip Details */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Détails du trajet
                </h3>

                <div className="space-y-2">
                  <Label>Adresse de départ *</Label>
                  <AddressAutocomplete
                    value={pickupAddress}
                    onChange={handlePickupChange}
                    placeholder="Adresse de prise en charge"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Adresse d'arrivée *</Label>
                  <AddressAutocomplete
                    value={destinationAddress}
                    onChange={handleDestinationChange}
                    placeholder="Adresse de destination"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Date et heure *
                    </Label>
                    <Input
                      id="scheduledDate"
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passengers">Passagers</Label>
                    <Input
                      id="passengers"
                      type="number"
                      min={1}
                      max={7}
                      value={passengersCount}
                      onChange={(e) => setPassengersCount(parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Informations supplémentaires (bagages, enfants, etc.)"
                    rows={3}
                  />
                </div>
              </div>

              {/* Price Estimation */}
              {(estimatedPrice !== null || calculating) && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Estimation du prix
                  </h3>
                  {calculating ? (
                    <p className="text-muted-foreground">Calcul en cours...</p>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span>Distance estimée</span>
                        <span className="font-medium">{distance?.toFixed(1)} km</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Durée estimée</span>
                        <span className="font-medium">{duration} min</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                        <span>Prix estimé</span>
                        <span className="text-primary">{estimatedPrice?.toFixed(2)} €</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        * Prix indicatif, le tarif final peut varier selon les conditions de circulation
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Warning */}
              <Alert variant="default" className="border-warning/50 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-sm">
                  En réservant sans inscription, vous recevrez un lien de suivi et le chauffeur pourra vous contacter directement. 
                  Pour un suivi complet et des avantages exclusifs, nous vous recommandons de vous inscrire.
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={submitting || !pickupCoords || !destinationCoords}
              >
                {submitting ? "Envoi en cours..." : "Envoyer la demande de réservation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestBooking;
