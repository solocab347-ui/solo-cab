import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { subscriptionManager } from "@/lib/subscriptionManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  MapPin, Clock, Phone, CheckCircle, XCircle, Car, Star,
  Navigation, MessageCircle, ArrowLeft, Loader2, CreditCard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { RideChatPanel } from "@/components/chat/RideChatPanel";
import logo from "@/assets/logo-solocab.png";

type CoursePhase = 'accepted' | 'driver_approaching' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled' | 'refused';

interface CourseData {
  id: string;
  status: string;
  pickup_address: string;
  destination_address: string;
  scheduled_date: string;
  distance_km: number | null;
  duration_minutes: number | null;
  guest_estimated_price: number | null;
  final_payment_amount: number | null;
  payment_method: string | null;
  payment_status: string | null;
  client_rating: number | null;
  guest_tracking_token: string | null;
  course_started_at: string | null;
  driver_id: string;
  is_guest_booking: boolean;
  guest_name: string | null;
}

interface DriverInfo {
  id: string;
  company_name: string | null;
  profile_photo_url: string | null;
  contact_phone: string | null;
}

const PHASE_ORDER: CoursePhase[] = ['accepted', 'driver_approaching', 'driver_arrived', 'in_progress', 'completed'];

const PHASE_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; description: string }> = {
  accepted: { label: 'Course acceptée', icon: CheckCircle, description: 'Le chauffeur a accepté votre course' },
  driver_approaching: { label: 'En approche', icon: Navigation, description: 'Le chauffeur se dirige vers vous' },
  driver_arrived: { label: 'Chauffeur arrivé', icon: Car, description: 'Le chauffeur est au point de prise en charge' },
  in_progress: { label: 'En cours', icon: Car, description: 'Vous êtes en route vers votre destination' },
  completed: { label: 'Terminée', icon: CheckCircle, description: 'Votre course est terminée' },
};

const ClientRideTracking = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [rideRequestId, setRideRequestId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;
    const { data, error } = await supabase
      .from('courses')
      .select('id, status, pickup_address, destination_address, scheduled_date, distance_km, duration_minutes, guest_estimated_price, final_payment_amount, payment_method, payment_status, client_rating, guest_tracking_token, course_started_at, driver_id, is_guest_booking, guest_name')
      .eq('id', courseId)
      .single();

    if (error || !data) {
      console.error('Error fetching course:', error);
      setLoading(false);
      return;
    }

    setCourse(data as CourseData);
    if (data.client_rating) {
      setRating(data.client_rating);
      setRatingSubmitted(true);
    }

    // Fetch driver info
    const { data: driverData } = await supabase
      .from('drivers')
      .select('id, company_name, profile_photo_url, contact_phone')
      .eq('id', data.driver_id)
      .single();

    if (driverData) setDriver(driverData as unknown as DriverInfo);

    // Get ride_request for chat
    const { data: rr } = await supabase
      .from('ride_requests')
      .select('id')
      .eq('final_course_id', data.id)
      .limit(1);
    if (rr?.[0]) setRideRequestId(rr[0].id);

    setLoading(false);
  }, [courseId]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  // Realtime updates
  useEffect(() => {
    if (!courseId) return;
    const cleanup = subscriptionManager.subscribe(
      `client-tracking-${courseId}`,
      { table: 'courses', event: 'UPDATE', filter: `id=eq.${courseId}` },
      (payload) => {
        const updated = payload.new as any;
        setCourse(prev => prev ? { ...prev, ...updated } : null);
        
        // Show toast for status changes
        if (updated.status === 'driver_arrived') {
          toast.info('🚗 Votre chauffeur est arrivé !');
        } else if (updated.status === 'in_progress') {
          toast.info('🛣️ Course en cours, bon trajet !');
        } else if (updated.status === 'completed') {
          toast.success('✅ Course terminée !');
        }
      }
    );
    return cleanup;
  }, [courseId]);

  // Polling fallback
  useEffect(() => {
    if (!courseId) return;
    const interval = setInterval(fetchCourse, 10000);
    return () => clearInterval(interval);
  }, [courseId, fetchCourse]);

  const handleSubmitRating = async () => {
    if (!courseId || rating === 0) return;
    setIsSubmittingRating(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ client_rating: rating })
        .eq('id', courseId);
      if (error) throw error;
      setRatingSubmitted(true);
      toast.success('Merci pour votre note !');
    } catch {
      toast.error('Erreur lors de l\'envoi de votre note');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const getCurrentPhaseIndex = () => {
    if (!course) return -1;
    const status = course.status as CoursePhase;
    return PHASE_ORDER.indexOf(status);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Course introuvable</h2>
            <Button onClick={() => navigate('/client-dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCancelled = course.status === 'cancelled' || course.status === 'refused';
  const isCompleted = course.status === 'completed';
  const isActive = !isCancelled && !isCompleted;
  const currentPhaseIndex = getCurrentPhaseIndex();
  const driverName = driver?.company_name || 'Chauffeur';
  const price = course.final_payment_amount || course.guest_estimated_price;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <img src={logo} alt="SoloCab" className="w-9 h-9 object-contain" />
            </Link>
            <h1 className="text-base font-bold">Suivi de course</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/client-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-lg space-y-4 pb-8">
        {/* Live Status Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={course.status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className={`border-2 ${isActive ? 'border-primary/30' : isCompleted ? 'border-green-500/30' : 'border-destructive/30'}`}>
              <CardContent className="pt-6 pb-4 text-center space-y-3">
                {isActive && (
                  <motion.div
                    className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {course.status === 'accepted' && <CheckCircle className="h-8 w-8 text-primary" />}
                    {course.status === 'driver_approaching' && <Navigation className="h-8 w-8 text-primary" />}
                    {course.status === 'driver_arrived' && <Car className="h-8 w-8 text-primary" />}
                    {course.status === 'in_progress' && <Car className="h-8 w-8 text-primary" />}
                  </motion.div>
                )}
                {isCompleted && (
                  <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                )}
                {isCancelled && (
                  <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto">
                    <XCircle className="h-8 w-8 text-destructive" />
                  </div>
                )}

                <h2 className="text-lg font-bold">
                  {PHASE_CONFIG[course.status]?.label || course.status}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {PHASE_CONFIG[course.status]?.description || ''}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Phase Timeline */}
        {!isCancelled && (
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                {PHASE_ORDER.map((phase, index) => {
                  const config = PHASE_CONFIG[phase];
                  const isReached = index <= currentPhaseIndex;
                  const isCurrent = phase === course.status;
                  const Icon = config.icon;
                  return (
                    <div key={phase} className="flex flex-col items-center flex-1 relative">
                      <motion.div
                        className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all ${
                          isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                          isReached ? 'bg-primary/20 text-primary' :
                          'bg-muted text-muted-foreground'
                        }`}
                        animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Icon className="w-4 h-4" />
                      </motion.div>
                      <span className={`text-[10px] text-center mt-1 leading-tight ${isReached ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {config.label}
                      </span>
                      {index < PHASE_ORDER.length - 1 && (
                        <div className={`absolute top-4 left-[55%] w-[90%] h-0.5 -z-0 ${
                          index < currentPhaseIndex ? 'bg-primary/40' : 'bg-muted'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Driver Card */}
        {driver && (
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14 border-2 border-primary/20">
                  <AvatarImage src={driver.profile_photo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {driverName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{driverName}</p>
                  <p className="text-xs text-muted-foreground">Votre chauffeur</p>
                </div>
                {driver.contact_phone && isActive && (
                  <a href={`tel:${driver.contact_phone}`} className="shrink-0">
                    <Button variant="outline" size="icon" className="rounded-full">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
              {/* Chat */}
              {rideRequestId && isActive && (
                <div className="mt-3">
                  <RideChatPanel
                    rideId={rideRequestId}
                    senderType="client"
                    senderId={course.id}
                    otherName={driverName.split(' ')[0]}
                    triggerLabel="💬 Contacter le chauffeur"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Route Details */}
        <Card>
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <div className="w-0.5 h-10 bg-gradient-to-b from-green-500 to-primary" />
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              </div>
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <p className="text-xs text-muted-foreground">Départ</p>
                  <p className="text-sm font-medium">{course.pickup_address}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Arrivée</p>
                  <p className="text-sm font-medium">{course.destination_address}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <div className="flex gap-4 text-sm text-muted-foreground">
                {course.distance_km && <span>{course.distance_km.toFixed(1)} km</span>}
                {course.duration_minutes && <span>~{course.duration_minutes} min</span>}
              </div>
              {price && (
                <span className="text-lg font-bold text-primary">{price.toFixed(2)}€</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Info */}
        {course.payment_method && (
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {course.payment_method === 'cash' ? 'Espèces' :
                   course.payment_method === 'stripe' ? 'Carte bancaire' :
                   course.payment_method === 'card' ? 'Carte bancaire' : course.payment_method}
                </span>
              </div>
              <Badge variant="outline" className={
                course.payment_status === 'paid' ? 'bg-green-500/10 text-green-600 border-green-500/30' :
                'bg-amber-500/10 text-amber-600 border-amber-500/30'
              }>
                {course.payment_status === 'paid' ? 'Payé' : 'En attente'}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Rating Section - Show after completion */}
        {isCompleted && !ratingSubmitted && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-center">Comment s'est passée votre course ?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
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
                {rating > 0 && (
                  <Button
                    onClick={handleSubmitRating}
                    className="w-full"
                    disabled={isSubmittingRating}
                  >
                    {isSubmittingRating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Envoyer ma note ({rating}/5)
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Rating submitted */}
        {isCompleted && ratingSubmitted && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">Merci pour votre évaluation !</p>
            </CardContent>
          </Card>
        )}

        {/* Guest tracking link */}
        {course.guest_tracking_token && course.is_guest_booking && (
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">Lien de suivi partageable</p>
              <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                {window.location.origin}/reservation-suivi/{course.guest_tracking_token}
              </code>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          🔄 Cette page se met à jour en temps réel
        </p>
      </main>
    </div>
  );
};

export default ClientRideTracking;
