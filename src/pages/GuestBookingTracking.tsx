import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { checkDriverStripeStatus } from "@/hooks/useDriverStripeStatus";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavigationHeader } from "@/components/NavigationHeader";
import { Calendar, MapPin, Clock, Phone, User, CheckCircle, XCircle, Clock3, UserPlus, RefreshCw, Car, Users, CreditCard, Loader2, Star, Navigation } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logo from "@/assets/logo-solocab.png";
import { toast } from "sonner";
import { RideChatPanel } from "@/components/chat/RideChatPanel";

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
  driver_latitude: number | null;
  driver_longitude: number | null;
  client_rating: number | null;
}

const GuestBookingTracking = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const guestId = `guest_${token?.substring(0, 8) || 'unknown'}`;
  const retryTimeoutRef = useRef<number | null>(null);

  const fetchBooking = async (attempt = 0) => {
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
          driver_avatar_url: rawBooking.driver_avatar_url,
          created_at: rawBooking.created_at,
          is_shared_course: rawBooking.is_shared_course ?? false,
          shared_drivers: sharedDrivers,
          devis_amount: rawBooking.devis_amount,
          quote_number: rawBooking.quote_number,
          final_payment_amount: rawBooking.final_payment_amount ?? null,
          distance_km: rawBooking.distance_km ?? null,
          driver_latitude: rawBooking.driver_latitude ?? null,
          driver_longitude: rawBooking.driver_longitude ?? null,
          client_rating: rawBooking.client_rating ?? null,
        };
        setBooking(parsedBooking);

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
        setRefreshing(false);
      }
    }
  };

  const checkDriverPaymentAndStatus = async (bookingData: BookingInfo) => {
    try {
      // Use RPC to get payment info securely (no direct courses query for anon)
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
      // Fallback: use what we have from the booking data
    }
  };

  useEffect(() => {
    fetchBooking(0);
    
    const interval = setInterval(() => fetchBooking(0), 15000);
    
    return () => {
      clearInterval(interval);
      if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);
    };
  }, [token]);

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
      }
    );

    return cleanup;
  }, [booking?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBooking();
  };

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
    
    if (rating <= 3) {
      if (!ratingReason) {
        toast.error('Veuillez sélectionner un motif');
        return;
      }
      if (!ratingReasonDetail.trim()) {
        toast.error('Veuillez expliquer brièvement ce qui s\'est passé');
        return;
      }
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
      if (rating >= 4) {
        toast.success('Merci pour votre évaluation !');
      } else {
        toast.success('Votre note a été soumise et sera examinée par notre système d\'arbitrage.');
      }
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
      // Check if there's a facture with a Stripe payment ID
      const { data: facture } = await supabase
        .from('factures')
        .select('stripe_payment_id, final_payment_amount')
        .eq('course_id', booking.id)
        .maybeSingle();

      if (facture?.stripe_payment_id) {
        // Redirect to Stripe payment - the driver should have sent a payment link
        toast.info("Veuillez utiliser le lien de paiement envoyé par votre chauffeur par SMS ou email.");
        return;
      }

      // If no payment yet, inform the user
      toast.info("Le chauffeur n'a pas encore finalisé la course. Vous recevrez un lien de paiement par email ou SMS.");
    } catch (error) {
      console.error('Payment error:', error);
      toast.error("Erreur lors du paiement. Veuillez réessayer.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Clock3 className="w-3 h-3 mr-1" />
            En attente de confirmation
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmée
          </Badge>
        );
      case 'driver_approaching':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            <Navigation className="w-3 h-3 mr-1" />
            Chauffeur en approche
          </Badge>
        );
      case 'driver_arrived':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            <Car className="w-3 h-3 mr-1" />
            Chauffeur arrivé
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            <Car className="w-3 h-3 mr-1" />
            En cours
          </Badge>
        );
      case 'refused':
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            {status === 'refused' ? 'Refusée' : 'Annulée'}
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Terminée
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return "Votre demande de réservation a été envoyée. Le chauffeur va l'examiner et vous confirmer la course.";
      case 'accepted':
        return "Votre réservation a été confirmée ! Le chauffeur se prépare.";
      case 'driver_approaching':
        return "Le chauffeur est en route vers votre point de prise en charge.";
      case 'driver_arrived':
        return "Le chauffeur est arrivé au point de rendez-vous !";
      case 'in_progress':
        return "Votre course est en cours. Bon trajet !";
      case 'refused':
        return "Nous sommes désolés, le chauffeur n'est pas disponible pour cette course. N'hésitez pas à contacter un autre chauffeur.";
      case 'cancelled':
        return "Cette réservation a été annulée.";
      case 'completed':
        if (paymentStatus === 'paid') {
          return "Course terminée et payée. Merci d'avoir utilisé SoloCab !";
        }
        if (driverUsesStripe && paymentStatus !== 'paid') {
          return "Votre course est terminée. Veuillez procéder au paiement ci-dessous.";
        }
        return "Cette course est terminée. Merci d'avoir utilisé SoloCab !";
      default:
        return "";
    }
  };

  // Status timeline steps
  const getTimelineSteps = (status: string) => {
    const steps = [
      { key: 'pending', label: 'Envoyée', icon: Clock3 },
      { key: 'accepted', label: 'Confirmée', icon: CheckCircle },
      { key: 'driver_approaching', label: 'En approche', icon: Navigation },
      { key: 'driver_arrived', label: 'Arrivé', icon: Car },
      { key: 'in_progress', label: 'En cours', icon: Car },
      { key: 'completed', label: 'Terminée', icon: CheckCircle },
    ];

    const statusOrder = ['pending', 'accepted', 'driver_approaching', 'driver_arrived', 'in_progress', 'completed'];
    const currentIndex = statusOrder.indexOf(status);
    const isCancelled = status === 'refused' || status === 'cancelled';

    return steps.map((step, index) => ({
      ...step,
      isActive: !isCancelled && index <= currentIndex,
      isCurrent: step.key === status,
      isCancelled: isCancelled && index === 0,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
  const timelineSteps = getTimelineSteps(booking.status);
  const showPaymentSection = booking.status === 'completed' && driverUsesStripe && paymentStatus !== 'paid';
  const showPaymentSuccess = booking.status === 'completed' && paymentStatus === 'paid';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <NavigationHeader />
      
      <div className="container max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <img src={logo} alt="SoloCab" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Suivi de votre réservation</h1>
          <p className="text-muted-foreground">Bonjour {booking.guest_name}</p>
        </div>

        {/* Status Timeline */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Statut de la réservation</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              {getStatusBadge(booking.status)}
            </div>
            
            {/* Timeline visualization */}
            {booking.status !== 'refused' && booking.status !== 'cancelled' && (
              <div className="flex items-center justify-between px-4 py-3">
                {timelineSteps.map((step, index) => (
                  <div key={step.key} className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-colors ${
                      step.isActive 
                        ? step.isCurrent ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <step.icon className="w-4 h-4" />
                    </div>
                    <span className={`text-xs text-center ${step.isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                    {index < timelineSteps.length - 1 && (
                      <div className={`absolute h-0.5 w-full ${step.isActive ? 'bg-primary/30' : 'bg-muted'}`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-center text-muted-foreground text-sm">
              {getStatusMessage(booking.status)}
            </p>
          </CardContent>
        </Card>

        {/* Payment Section - When course is completed and driver uses Stripe */}
        {showPaymentSection && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                <CreditCard className="h-5 w-5" />
                Paiement de la course
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-background rounded-lg p-4">
                <div className="flex justify-between items-center">
                   <span className="text-muted-foreground">Montant à régler</span>
                  <span className="text-2xl font-bold text-primary">
                    {(booking.devis_amount || booking.final_payment_amount || booking.guest_estimated_price)?.toFixed(2)} €
                  </span>
                </div>
              </div>
              <Button 
                onClick={handlePayment} 
                className="w-full" 
                size="lg"
                disabled={paymentLoading}
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payer maintenant
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Paiement sécurisé par Stripe
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment Success */}
        {showPaymentSuccess && (
          <Card className="mb-6 border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-semibold text-emerald-700 mb-1">Paiement confirmé</h3>
              <p className="text-sm text-muted-foreground">
                Votre paiement de {(booking.devis_amount || booking.final_payment_amount || booking.guest_estimated_price)?.toFixed(2)} € a été traité avec succès.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Booking Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Détails de la course
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Départ</p>
                <p className="font-medium">{booking.pickup_address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Arrivée</p>
                <p className="font-medium">{booking.destination_address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Date et heure</p>
                <p className="font-medium">
                  {format(new Date(booking.scheduled_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                </p>
              </div>
            </div>

            {(booking.devis_amount || booking.guest_estimated_price) && (
              <div className="bg-muted/50 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-muted-foreground">
                      {booking.devis_amount ? "Prix du devis" : "Prix estimé"}
                    </span>
                    {booking.quote_number && (
                      <p className="text-xs text-muted-foreground">
                        Réf: {booking.quote_number}
                      </p>
                    )}
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {(booking.devis_amount || booking.final_payment_amount || booking.guest_estimated_price)?.toFixed(2)} €
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Driver Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5" />
              {booking.is_shared_course ? "Vos chauffeurs" : "Votre chauffeur"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14">
                <AvatarImage src={booking.driver_avatar_url || undefined} alt={driverDisplayName} />
                <AvatarFallback className="bg-primary/10">
                  <User className="w-7 h-7 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold">{driverDisplayName}</p>
                <p className="text-xs text-muted-foreground">Chauffeur principal</p>
              </div>
              {/* Quick call button */}
              {booking.driver_phone && ['accepted', 'driver_approaching', 'driver_arrived', 'in_progress'].includes(booking.status) && (
                <a href={`tel:${booking.driver_phone}`}>
                  <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-green-500/30 text-green-500 hover:bg-green-500/10">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
              )}
            </div>

            {/* Chat + Call actions for active rides */}
            {rideRequestId && ['accepted', 'driver_approaching', 'in_progress', 'driver_arrived'].includes(booking.status) && (
              <div className="mt-3">
                <RideChatPanel
                  rideId={rideRequestId}
                  senderType="guest"
                  senderId={guestId}
                  otherName={driverDisplayName.split(' ')[0]}
                  triggerLabel="💬 Contacter le chauffeur"
                />
              </div>
            )}

            {booking.is_shared_course && booking.shared_drivers && booking.shared_drivers.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-amber-500" />
                  <p className="text-sm font-medium text-amber-700">Course partagée</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Cette course peut être assurée en partenariat avec les chauffeurs suivants :
                </p>
                <div className="flex flex-wrap gap-3">
                  {booking.shared_drivers.map((driver) => (
                    <div key={driver.id} className="flex items-center gap-2 bg-muted/50 rounded-full py-1 px-3">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={driver.avatar_url || undefined} alt={driver.name} />
                        <AvatarFallback className="text-xs">
                          {driver.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{driver.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {booking.status === 'pending' && (
              <p className="text-sm text-muted-foreground mt-3">
                Le chauffeur va examiner votre demande et vous confirmer la course rapidement.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Rating Section */}
        {booking.status === 'completed' && !ratingSubmitted && (
          <Card className="mb-6 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-center">Comment s'est passée votre course ?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  </button>
                ))}
              </div>
              
              {/* Low rating reason form */}
              {showReasonForm && rating <= 3 && rating > 0 && (
                <div className="space-y-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                    <XCircle className="w-4 h-4" />
                    <span>Note basse — merci de préciser le motif</span>
                  </div>
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
                  <p className="text-xs text-muted-foreground">
                    Cette note sera examinée par notre système d'arbitrage. Le chauffeur pourra contester si nécessaire.
                  </p>
                </div>
              )}

              {rating > 0 && (
                <Button
                  onClick={handleSubmitRating}
                  className="w-full"
                  disabled={isSubmittingRating}
                >
                  {isSubmittingRating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Envoyer ma note ({rating}/5)
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {booking.status === 'completed' && ratingSubmitted && (
          <Card className="mb-6 border-green-500/20 bg-green-500/5">
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-6 w-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Merci pour votre évaluation !</p>
            </CardContent>
          </Card>
        )}

        {/* Registration CTA */}
        <Alert className="border-primary/50 bg-primary/5">
          <UserPlus className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p>
              <strong>Inscrivez-vous gratuitement</strong> pour bénéficier de tous les avantages SoloCab :
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Historique complet de vos courses</li>
              <li>Réservation simplifiée</li>
              <li>Devis et factures automatiques</li>
              <li>Communication directe avec votre chauffeur</li>
            </ul>
            <Button 
              onClick={() => navigate('/chauffeurs')}
              className="w-full mt-2"
            >
              S'inscrire maintenant
            </Button>
          </AlertDescription>
        </Alert>

        <p className="text-center text-sm text-muted-foreground mt-6">
          💡 Cette page se met à jour automatiquement
        </p>
      </div>
    </div>
  );
};

export default GuestBookingTracking;
