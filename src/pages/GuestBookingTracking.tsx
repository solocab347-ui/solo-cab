import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { checkDriverStripeStatus } from "@/hooks/useDriverStripeStatus";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Calendar, MapPin, Clock, Phone, User, CheckCircle, XCircle, Clock3, UserPlus, RefreshCw, Car, Users, CreditCard, Loader2, Star, Navigation, Route, Timer, Gauge, Download, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logo from "@/assets/logo-solocab.png";
import { toast } from "sonner";
import { RideChatPanel } from "@/components/chat/RideChatPanel";
import { useETACalculation } from "@/hooks/useETACalculation";

interface SharedDriver {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface BookingInfo {
  id: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  status: string;
  guest_name: string;
  guest_estimated_price: number | null;
  driver_name: string | null;
  driver_company: string | null;
  driver_phone: string | null;
  driver_avatar_url: string | null;
  created_at: string;
  is_shared_course: boolean;
  shared_drivers: SharedDriver[];
  devis_amount: number | null;
  quote_number: string | null;
  final_payment_amount: number | null;
  distance_km: number | null;
  duration_minutes: number | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  driver_latitude: number | null;
  driver_longitude: number | null;
  client_rating: number | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_plate: string | null;
  facture_id: string | null;
  facture_number: string | null;
  facture_amount: number | null;
  facture_payment_status: string | null;
}

const GuestBookingTracking = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [driverUsesStripe, setDriverUsesStripe] = useState(false);
  const [rideRequestId, setRideRequestId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [ratingReason, setRatingReason] = useState('');
  const [ratingReasonDetail, setRatingReasonDetail] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const guestId = token ? `guest_${token}` : 'guest_unknown';
  const retryTimeoutRef = useRef<number | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ETA calculation
  const isApproaching = booking?.status === 'driver_approaching';
  const isInProgress = booking?.status === 'in_progress';
  const etaEnabled = (isApproaching || isInProgress) && !!booking?.driver_latitude && !!booking?.driver_longitude;

  const etaTarget = isApproaching
    ? (booking?.pickup_latitude && booking?.pickup_longitude ? { lat: booking.pickup_latitude, lng: booking.pickup_longitude } : null)
    : (booking?.destination_latitude && booking?.destination_longitude ? { lat: booking.destination_latitude, lng: booking.destination_longitude } : null);

  const { eta, loading: etaLoading, forceRefresh: refreshETA } = useETACalculation({
    driverLocation: booking?.driver_latitude && booking?.driver_longitude
      ? { lat: booking.driver_latitude, lng: booking.driver_longitude }
      : null,
    targetLocation: etaTarget,
    enabled: etaEnabled,
  });

  const fetchBooking = useCallback(async (attempt = 0) => {
    if (!token) return;

    let shouldFinalize = true;
    const scheduleRetry = () => {
      if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = window.setTimeout(() => {
        fetchBooking(attempt + 1);
      }, 1500);
    };
    
    try {
      const { data, error } = await supabase
        .rpc('get_guest_booking_by_token' as any, { _token: token });

      if (error) throw error;

      if (data && data.length > 0) {
        const rawBooking = data[0];
        const sharedDrivers: SharedDriver[] = rawBooking.shared_drivers 
          ? (rawBooking.shared_drivers as unknown as SharedDriver[])
          : [];
        
        const parsedBooking: BookingInfo = {
          id: rawBooking.id,
          pickup_address: rawBooking.pickup_address,
          destination_address: rawBooking.destination_address,
          scheduled_date: rawBooking.scheduled_date,
          status: rawBooking.status,
          guest_name: rawBooking.guest_name,
          guest_estimated_price: rawBooking.guest_estimated_price,
          driver_name: rawBooking.driver_name,
          driver_company: rawBooking.driver_company,
          driver_phone: rawBooking.driver_phone,
          driver_avatar_url: rawBooking.driver_avatar ?? rawBooking.driver_avatar_url ?? null,
          created_at: rawBooking.created_at,
          is_shared_course: rawBooking.is_shared_course ?? false,
          shared_drivers: sharedDrivers,
          devis_amount: rawBooking.devis_amount,
          quote_number: rawBooking.quote_number,
          final_payment_amount: rawBooking.final_payment_amount ?? null,
          distance_km: rawBooking.distance_km ?? null,
          duration_minutes: rawBooking.duration_minutes ?? null,
          pickup_latitude: rawBooking.pickup_latitude ?? null,
          pickup_longitude: rawBooking.pickup_longitude ?? null,
          destination_latitude: rawBooking.destination_latitude ?? null,
          destination_longitude: rawBooking.destination_longitude ?? null,
          driver_latitude: rawBooking.driver_latitude ?? null,
          driver_longitude: rawBooking.driver_longitude ?? null,
          client_rating: rawBooking.client_rating ?? null,
          vehicle_brand: rawBooking.vehicle_brand ?? null,
          vehicle_model: rawBooking.vehicle_model ?? null,
          vehicle_color: rawBooking.vehicle_color ?? null,
          vehicle_plate: rawBooking.vehicle_plate ?? null,
          facture_id: rawBooking.facture_id ?? null,
          facture_number: rawBooking.facture_number ?? null,
          facture_amount: rawBooking.facture_amount ?? null,
          facture_payment_status: rawBooking.facture_payment_status ?? null,
        };
        setBooking(parsedBooking);
        setLastRefresh(new Date());

        if (parsedBooking.client_rating && parsedBooking.client_rating > 0) {
          setRating(parsedBooking.client_rating);
          setRatingSubmitted(true);
        }

        if (token) {
          const { data: rideReqId } = await supabase
            .rpc('get_ride_request_id_for_guest' as any, { _token: token });
          if (rideReqId) setRideRequestId(rideReqId);
        }

        await checkDriverPaymentAndStatus(parsedBooking);
      } else if (attempt < 4) {
        shouldFinalize = false;
        scheduleRetry();
        return;
      } else {
        setBooking(null);
      }
    } catch (error) {
      if (attempt < 4) {
        shouldFinalize = false;
        scheduleRetry();
        return;
      }
      console.error("Error fetching booking:", error);
      setBooking(null);
    } finally {
      if (shouldFinalize) {
        setLoading(false);
      }
    }
  }, [token]);

  const checkDriverPaymentAndStatus = async (bookingData: BookingInfo) => {
    try {
      const { data: paymentInfo } = await supabase
        .rpc('get_guest_course_payment_info' as any, { _token: token });
      
      if (paymentInfo && paymentInfo.length > 0) {
        const info = paymentInfo[0];
        setPaymentStatus(info.payment_status || null);
        
        if (info.driver_id) {
          const usesStripe = await checkDriverStripeStatus(info.driver_id);
          setDriverUsesStripe(usesStripe);
        }
        
        if (info.facture_payment_status === 'paid') {
          setPaymentStatus('paid');
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  // Auto-refresh every 5 seconds
  useEffect(() => {
    fetchBooking(0);
    
    refreshIntervalRef.current = setInterval(() => fetchBooking(0), 5000);
    
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);
    };
  }, [fetchBooking]);

  // Realtime subscription for instant status updates
  useEffect(() => {
    if (!booking?.id) return;

    const cleanup = subscriptionManager.subscribe(
      `guest-tracking-${booking.id}`,
      { table: 'courses', event: 'UPDATE', filter: `id=eq.${booking.id}` },
      (payload) => {
        const newStatus = (payload.new as any).status;
        const newPaymentStatus = (payload.new as any).payment_status;
        
        if (newStatus && booking) {
          setBooking(prev => prev ? { ...prev, status: newStatus } : null);
        }
        if (newPaymentStatus) {
          setPaymentStatus(newPaymentStatus);
        }
        // Force a full refresh on status change for latest GPS data
        fetchBooking(0);
      }
    );

    return cleanup;
  }, [booking?.id, fetchBooking]);

  const handleStarClick = (star: number) => {
    setRating(star);
    if (star <= 3) {
      setShowReasonForm(true);
    } else {
      setShowReasonForm(false);
      setRatingReason('');
      setRatingReasonDetail('');
    }
  };

  const handleSubmitRating = async () => {
    if (!booking || rating === 0 || !token) return;
    
    if (rating <= 3 && !ratingReason) {
      toast.error('Veuillez sélectionner un motif');
      return;
    }
    
    setIsSubmittingRating(true);
    try {
      const { error } = await supabase
        .rpc('guest_submit_rating' as any, { 
          _token: token, 
          _rating: rating,
          _reason: rating <= 3 ? ratingReason : null,
          _reason_detail: rating <= 3 ? ratingReasonDetail.trim() : null,
        });
      if (error) throw error;
      setRatingSubmitted(true);
      setBooking(prev => prev ? { ...prev, client_rating: rating } : null);
      toast.success(rating >= 4 ? 'Merci pour votre évaluation !' : 'Votre note a été soumise et sera examinée.');
    } catch {
      toast.error('Erreur lors de l\'envoi de votre note');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handlePayment = async () => {
    if (!booking) return;
    
    setPaymentLoading(true);
    try {
      const { data: facture } = await supabase
        .from('factures')
        .select('stripe_payment_id, final_payment_amount')
        .eq('course_id', booking.id)
        .maybeSingle();

      if (facture?.stripe_payment_id) {
        toast.info("Veuillez utiliser le lien de paiement envoyé par votre chauffeur.");
        return;
      }
      toast.info("Le chauffeur n'a pas encore finalisé la course. Vous recevrez un lien de paiement.");
    } catch (error) {
      console.error('Payment error:', error);
      toast.error("Erreur lors du paiement.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCancelCourse = async () => {
    if (!token) return;
    setCancelLoading(true);
    try {
      const { data, error } = await supabase.rpc('cancel_guest_course' as any, { _token: token });
      if (error) throw error;
      const result = data as any;
      if (result?.success) {
        toast.success('Votre réservation a été annulée.');
        setBooking(prev => prev ? { ...prev, status: 'cancelled' } : null);
        setShowCancelConfirm(false);
      } else {
        toast.error(result?.error || 'Impossible d\'annuler cette course.');
      }
    } catch {
      toast.error('Erreur lors de l\'annulation.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!booking || !booking.facture_number) return;
    
    // Use jsPDF-like approach inline (simple text-based PDF)
    const invoiceContent = [
      `FACTURE - ${booking.facture_number}`,
      ``,
      `Client: ${booking.guest_name}`,
      `Date: ${format(new Date(booking.scheduled_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}`,
      ``,
      `Trajet:`,
      `  Départ: ${booking.pickup_address}`,
      `  Arrivée: ${booking.destination_address}`,
      ``,
      `Distance: ${booking.distance_km?.toFixed(1) || '-'} km`,
      `Durée estimée: ${booking.duration_minutes || '-'} min`,
      ``,
      `Montant TTC: ${(booking.facture_amount || booking.devis_amount || booking.guest_estimated_price)?.toFixed(2)} €`,
      `Statut: ${booking.facture_payment_status === 'paid' ? 'Payée' : 'En attente'}`,
      ``,
      `Chauffeur: ${booking.driver_company || booking.driver_name || '-'}`,
      ``,
      `Merci d'avoir utilisé SoloCab !`,
    ].join('\n');

    const blob = new Blob([invoiceContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facture-${booking.facture_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Facture téléchargée');
  };

  // Status timeline
  const statusOrder = ['pending', 'accepted', 'driver_approaching', 'driver_arrived', 'in_progress', 'completed'];
  const timelineSteps = [
    { key: 'pending', label: 'Envoyée', icon: Clock3 },
    { key: 'accepted', label: 'Confirmée', icon: CheckCircle },
    { key: 'driver_approaching', label: 'En approche', icon: Navigation },
    { key: 'driver_arrived', label: 'Arrivé', icon: Car },
    { key: 'in_progress', label: 'En cours', icon: Route },
    { key: 'completed', label: 'Terminée', icon: CheckCircle },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground text-sm">Chargement du suivi...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <NavigationHeader />
        <div className="container max-w-md mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Réservation non trouvée</h2>
              <p className="text-muted-foreground mb-4">
                Ce lien de suivi n'est plus valide ou la réservation n'existe pas.
              </p>
              <Button onClick={() => navigate('/chauffeurs')}>
                Trouver un chauffeur
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const rawDriverName = booking.driver_company || booking.driver_name || "Votre chauffeur";
  const driverDisplayName = (() => {
    const parts = rawDriverName.trim().split(/\s+/);
    if (parts.length > 1) return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase()}.`;
    return rawDriverName;
  })();

  const currentIndex = statusOrder.indexOf(booking.status);
  const isCancelled = booking.status === 'refused' || booking.status === 'cancelled';
  const showPaymentSection = booking.status === 'completed' && driverUsesStripe && paymentStatus !== 'paid';
  const showPaymentSuccess = booking.status === 'completed' && paymentStatus === 'paid';

  const vehicleDescription = [booking.vehicle_brand, booking.vehicle_model].filter(Boolean).join(' ');
  const hasVehicleInfo = vehicleDescription || booking.vehicle_color || booking.vehicle_plate;

  const renderCancelSection = () => {
    if (!['pending', 'accepted', 'driver_approaching'].includes(booking.status)) return null;
    
    if (showCancelConfirm) {
      return (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p className="text-sm font-semibold text-destructive">Confirmer l'annulation ?</p>
            </div>
            <p className="text-xs text-muted-foreground">Cette action est irréversible. Votre réservation sera annulée.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowCancelConfirm(false)} disabled={cancelLoading}>
                Non, garder
              </Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleCancelCourse} disabled={cancelLoading}>
                {cancelLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                Oui, annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-destructive hover:bg-destructive/10 border border-destructive/20"
        onClick={() => setShowCancelConfirm(true)}
      >
        <XCircle className="w-4 h-4 mr-2" />
        Annuler ma réservation
      </Button>
    );
  };

  // Status-specific contextual content
  const getPhaseContent = () => {
    switch (booking.status) {
      case 'pending':
        return (
          <div className="text-center space-y-3 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock3 className="w-8 h-8 text-amber-500 animate-pulse" />
            </div>
            <h3 className="font-semibold text-lg">En attente de confirmation</h3>
            <p className="text-muted-foreground text-sm">
              Votre demande a été envoyée. Le chauffeur va l'examiner et vous confirmer rapidement.
            </p>
            {renderCancelSection()}
          </div>
        );
      
      case 'accepted':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg text-green-600">Course confirmée !</h3>
              <p className="text-muted-foreground text-sm">Le chauffeur se prépare pour votre course.</p>
            </div>
            {renderDriverCard()}
            {renderCancelSection()}
          </div>
        );
      
      case 'driver_approaching':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
                <Navigation className="w-8 h-8 text-blue-500 animate-bounce" />
              </div>
              <h3 className="font-semibold text-lg text-blue-600">Chauffeur en route vers vous</h3>
              <p className="text-muted-foreground text-sm">Il navigue vers votre point de prise en charge.</p>
            </div>
            {renderLiveTrackingInfo('approaching')}
            {renderDriverCard()}
            {renderCancelSection()}
          </div>
        );
      
      case 'driver_arrived':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center animate-pulse">
                <Car className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-lg text-emerald-600">Votre chauffeur est arrivé !</h3>
              <p className="text-muted-foreground text-sm">Il vous attend au point de rendez-vous.</p>
            </div>
            {renderDriverCard()}
          </div>
        );
      
      case 'in_progress':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Route className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <h3 className="font-semibold text-lg text-primary">Course en cours</h3>
              <p className="text-muted-foreground text-sm">En navigation vers votre destination.</p>
            </div>
            {renderLiveTrackingInfo('in_progress')}
            {renderDriverCard()}
          </div>
        );
      
      case 'completed':
        return (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="font-semibold text-lg text-emerald-600">Course terminée</h3>
              <p className="text-muted-foreground text-sm">
                {paymentStatus === 'paid' 
                  ? "Merci d'avoir utilisé SoloCab !" 
                  : driverUsesStripe 
                    ? "Veuillez procéder au paiement ci-dessous." 
                    : "Merci d'avoir utilisé SoloCab !"}
              </p>
            </div>
            {/* Invoice download */}
            {booking.facture_number && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Facture {booking.facture_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {(booking.facture_amount || booking.devis_amount || booking.guest_estimated_price)?.toFixed(2)} €
                      </p>
                    </div>
                    <Button onClick={handleDownloadInvoice} variant="outline" size="sm" className="gap-2">
                      <Download className="w-4 h-4" />
                      Télécharger
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      
      case 'refused':
      case 'cancelled':
        return (
          <div className="text-center space-y-3 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="font-semibold text-lg text-red-600">
              {booking.status === 'refused' ? 'Course refusée' : 'Course annulée'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {booking.status === 'refused' 
                ? "Le chauffeur n'est pas disponible. N'hésitez pas à contacter un autre chauffeur."
                : "Cette réservation a été annulée."}
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderLiveTrackingInfo = (phase: 'approaching' | 'in_progress') => {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary uppercase tracking-wider flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              Suivi en direct
            </span>
            <span className="text-[10px] text-muted-foreground">
              MàJ: {format(lastRefresh, 'HH:mm:ss')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* ETA */}
            <div className="bg-background rounded-lg p-3 text-center">
              <Timer className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">
                {phase === 'approaching' ? "Arrivée estimée" : "Temps restant"}
              </p>
              <p className="text-lg font-bold text-foreground">
                {etaLoading ? '...' : eta?.durationMin 
                  ? `${Math.ceil(eta.durationMin)} min` 
                  : '—'}
              </p>
            </div>
            {/* Distance */}
            <div className="bg-background rounded-lg p-3 text-center">
              <Route className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">
                {phase === 'approaching' ? "Distance" : "Km restants"}
              </p>
              <p className="text-lg font-bold text-foreground">
                {etaLoading ? '...' : eta?.distanceKm 
                  ? `${eta.distanceKm.toFixed(1)} km` 
                  : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] text-muted-foreground">
              Position GPS mise à jour toutes les 5 secondes
            </span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDriverCard = () => {
    return (
      <Card className="border-muted">
        <CardContent className="pt-4 pb-4 space-y-4">
          {/* Driver identity */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarImage src={booking.driver_avatar_url || undefined} alt={driverDisplayName} />
              <AvatarFallback className="bg-primary/10 text-lg">
                <User className="w-8 h-8 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate">{driverDisplayName}</p>
              {booking.driver_company && booking.driver_company !== driverDisplayName && (
                <p className="text-xs text-muted-foreground truncate">{booking.driver_company}</p>
              )}
              <p className="text-xs text-primary mt-0.5">Votre chauffeur</p>
            </div>
            {/* Call button */}
            {booking.driver_phone && ['accepted', 'driver_approaching', 'driver_arrived', 'in_progress'].includes(booking.status) && (
              <a href={`tel:${booking.driver_phone}`}>
                <Button variant="outline" size="icon" className="rounded-full h-11 w-11 border-green-500/30 text-green-500 hover:bg-green-500/10">
                  <Phone className="w-5 h-5" />
                </Button>
              </a>
            )}
          </div>

          {/* Vehicle info */}
          {hasVehicleInfo && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Car className="w-3 h-3" />
                Véhicule
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {vehicleDescription && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Modèle</span>
                    <span className="text-sm font-medium">{vehicleDescription}</span>
                  </div>
                )}
                {booking.vehicle_color && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Couleur</span>
                    <span className="text-sm font-medium">{booking.vehicle_color}</span>
                  </div>
                )}
                {booking.vehicle_plate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Immatriculation</span>
                    <Badge variant="outline" className="font-mono text-sm tracking-wider">
                      {booking.vehicle_plate}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat */}
          {rideRequestId && ['accepted', 'driver_approaching', 'in_progress', 'driver_arrived'].includes(booking.status) && (
            <RideChatPanel
              rideId={rideRequestId}
              senderType="guest"
              senderId={guestId}
              otherName={driverDisplayName.split(' ')[0]}
              triggerLabel="💬 Contacter le chauffeur"
            />
          )}

          {/* Shared drivers */}
          {booking.is_shared_course && booking.shared_drivers.length > 0 && (
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-medium text-amber-700">Course partagée</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {booking.shared_drivers.map((driver) => (
                  <div key={driver.id} className="flex items-center gap-1.5 bg-muted/50 rounded-full py-1 px-2.5">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={driver.avatar_url || undefined} alt={driver.name} />
                      <AvatarFallback className="text-[10px]">
                        {driver.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{driver.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <NavigationHeader />
      
      <div className="container max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="text-center">
          <img src={logo} alt="SoloCab" className="h-10 mx-auto mb-3" />
          <h1 className="text-xl font-bold">Suivi de votre réservation</h1>
          <p className="text-muted-foreground text-sm">Bonjour {booking.guest_name}</p>
        </div>

        {/* Timeline (compact, always at top) */}
        {!isCancelled && (
          <Card className="overflow-hidden">
            <CardContent className="pt-4 pb-4">
              <div className="relative flex items-start justify-between">
                {/* Background line */}
                <div className="absolute top-4 left-[8.33%] right-[8.33%] h-0.5 bg-muted z-0" />
                {/* Progress line */}
                {currentIndex > 0 && (
                  <div
                    className="absolute top-4 left-[8.33%] h-0.5 bg-primary z-[1] transition-all duration-700"
                    style={{ width: `${(currentIndex / (timelineSteps.length - 1)) * 83.33}%` }}
                  />
                )}
                {timelineSteps.map((step, index) => {
                  const isActive = index <= currentIndex;
                  const isCurrent = step.key === booking.status;
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1 relative z-[2]">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all duration-500 ${
                        isCurrent 
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' 
                          : isActive 
                            ? 'bg-primary/20 text-primary' 
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        <step.icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[9px] text-center leading-tight ${
                        isCurrent ? 'text-primary font-bold' : isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Phase content (main dynamic area) */}
        {getPhaseContent()}

        {/* Payment Section */}
        {showPaymentSection && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                <CreditCard className="h-5 w-5" />
                Paiement de la course
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-background rounded-lg p-3 flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Montant à régler</span>
                <span className="text-xl font-bold text-primary">
                  {(booking.devis_amount || booking.final_payment_amount || booking.guest_estimated_price)?.toFixed(2)} €
                </span>
              </div>
              <Button onClick={handlePayment} className="w-full" disabled={paymentLoading}>
                {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                {paymentLoading ? 'Chargement...' : 'Payer maintenant'}
              </Button>
            </CardContent>
          </Card>
        )}

        {showPaymentSuccess && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="pt-4 pb-4 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-semibold text-emerald-700 text-sm">Paiement confirmé</h3>
              <p className="text-xs text-muted-foreground">
                {(booking.devis_amount || booking.final_payment_amount || booking.guest_estimated_price)?.toFixed(2)} € traités avec succès.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Course details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Détails de la course
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Départ</p>
                <p className="text-sm font-medium">{booking.pickup_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Arrivée</p>
                <p className="text-sm font-medium">{booking.destination_address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date et heure</p>
                <p className="text-sm font-medium">
                  {format(new Date(booking.scheduled_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              </div>
            </div>
            {(booking.devis_amount || booking.guest_estimated_price) && (
              <div className="bg-muted/50 rounded-lg p-3 mt-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-muted-foreground">
                      {booking.devis_amount ? "Prix du devis" : "Prix estimé"}
                    </span>
                    {booking.quote_number && (
                      <p className="text-[10px] text-muted-foreground">Réf: {booking.quote_number}</p>
                    )}
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {(booking.devis_amount || booking.final_payment_amount || booking.guest_estimated_price)?.toFixed(2)} €
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Section */}
        {booking.status === 'completed' && !ratingSubmitted && (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-center">Comment s'est passée votre course ?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={`h-9 w-9 transition-colors ${
                      star <= (hoverRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                    }`} />
                  </button>
                ))}
              </div>
              
              {showReasonForm && rating <= 3 && rating > 0 && (
                <div className="space-y-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <select
                    value={ratingReason}
                    onChange={(e) => setRatingReason(e.target.value)}
                    className="w-full h-9 text-sm rounded-md border border-border bg-background px-3"
                  >
                    <option value="">Sélectionnez un motif</option>
                    <option value="late">Retard chauffeur</option>
                    <option value="dangerous_driving">Conduite dangereuse</option>
                    <option value="bad_behavior">Mauvais comportement</option>
                    <option value="dirty_vehicle">Véhicule sale</option>
                    <option value="bad_communication">Mauvaise communication</option>
                    <option value="bad_route">Mauvais itinéraire</option>
                    <option value="payment_issue">Problème paiement</option>
                    <option value="other">Autre</option>
                  </select>
                  <textarea
                    value={ratingReasonDetail}
                    onChange={(e) => setRatingReasonDetail(e.target.value)}
                    placeholder="Décrivez la situation..."
                    className="w-full text-sm min-h-[60px] rounded-md border border-border bg-background px-3 py-2 resize-none"
                    maxLength={500}
                  />
                </div>
              )}

              {rating > 0 && (
                <Button onClick={handleSubmitRating} className="w-full" disabled={isSubmittingRating}>
                  {isSubmittingRating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Envoyer ma note ({rating}/5)
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {booking.status === 'completed' && ratingSubmitted && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="flex justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-5 w-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Merci pour votre évaluation !</p>
            </CardContent>
          </Card>
        )}

        {/* Registration CTA */}
        <Alert className="border-primary/50 bg-primary/5">
          <UserPlus className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="text-sm">
              <strong>Inscrivez-vous gratuitement</strong> pour bénéficier de tous les avantages SoloCab.
            </p>
            <Button onClick={() => navigate('/chauffeurs')} size="sm" className="w-full">
              S'inscrire maintenant
            </Button>
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-center gap-1.5 pb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <p className="text-[11px] text-muted-foreground">Mise à jour automatique toutes les 5 secondes</p>
        </div>
      </div>
    </div>
  );
};

export default GuestBookingTracking;
