import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSoloCabSound } from '@/lib/solocabNotificationSound';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  MapPin,
  Calendar,
  Euro,
  User,
  X,
  Check,
  Clock,
  Navigation,
  Handshake,
  Users,
  Crown,
  CreditCard,
  Banknote,
  Route,
  Timer,
  Car,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { IncomingCourse } from '@/hooks/useIncomingCourseListener';

interface IncomingCourseOverlayProps {
  course: IncomingCourse | null;
  onDismiss: () => void;
  onAccepted: () => void;
  driverId: string | null;
}

const TIMEOUT_SECONDS = 60;

/** Calculate distance between two lat/lng points using Haversine formula */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Estimate approach time based on distance */
function estimateApproachMinutes(distanceKm: number): number {
  if (distanceKm < 2) return Math.max(3, Math.round((distanceKm / 20) * 60));
  if (distanceKm < 5) return Math.round((distanceKm / 30) * 60);
  if (distanceKm < 20) return Math.round((distanceKm / 40) * 60);
  return Math.round((distanceKm / 60) * 60);
}

/** Estimate trip duration based on distance */
function estimateTripMinutes(distanceKm: number): number {
  if (distanceKm < 5) return Math.round((distanceKm / 25) * 60);
  if (distanceKm < 20) return Math.round((distanceKm / 35) * 60);
  return Math.round((distanceKm / 50) * 60);
}

/** Get payment method label */
function getPaymentLabel(method?: string): { label: string; icon: typeof CreditCard } {
  switch (method) {
    case 'card':
      return { label: 'Carte bancaire', icon: CreditCard };
    case 'cash':
      return { label: 'Espèces', icon: Banknote };
    default:
      return { label: method || 'Non spécifié', icon: CreditCard };
  }
}

export function IncomingCourseOverlay({
  course,
  onDismiss,
  onAccepted,
  driverId,
}: IncomingCourseOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECONDS);
  const [accepting, setAccepting] = useState(false);
  const audioRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [approachInfo, setApproachInfo] = useState<{ distanceKm: number; minutes: number } | null>(null);

  // Calculate approach info using driver's current position
  useEffect(() => {
    if (!course || !driverId || !course.pickupLatitude || !course.pickupLongitude) {
      setApproachInfo(null);
      return;
    }

    // Get driver's current location
    supabase
      .from('drivers')
      .select('current_latitude, current_longitude')
      .eq('id', driverId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.current_latitude && data?.current_longitude && course.pickupLatitude && course.pickupLongitude) {
          const dist = haversineKm(
            data.current_latitude,
            data.current_longitude,
            course.pickupLatitude,
            course.pickupLongitude
          );
          setApproachInfo({
            distanceKm: Math.round(dist * 10) / 10,
            minutes: estimateApproachMinutes(dist),
          });
        }
      });
  }, [course?.id, driverId]);

  // Set driver to 'accepting' status when popup appears
  useEffect(() => {
    if (!course || !driverId) {
      setTimeLeft(TIMEOUT_SECONDS);
      return;
    }
    setTimeLeft(TIMEOUT_SECONDS);

    supabase.from('drivers').update({ 
      driver_status: 'accepting',
      is_available_now: false,
    }).eq('id', driverId).then(() => {
      console.log('[IncomingCourseOverlay] Driver set to accepting');
    });

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [course?.id, onDismiss]);

  // Sound + vibration — repeat every 4s (longer interval to prevent overlap)
  useEffect(() => {
    if (!course) return;

    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
    playSoloCabSound(1.0).catch(() => {});

    const soundInterval = setInterval(() => {
      playSoloCabSound(1.0).catch(() => {});
      if (navigator.vibrate) {
        navigator.vibrate([200, 80, 200]);
      }
    }, 4000);
    audioRef.current = soundInterval;

    return () => {
      clearInterval(soundInterval);
      if (navigator.vibrate) navigator.vibrate(0);
    };
  }, [course?.id]);

  const handleAccept = useCallback(async () => {
    if (!course || !driverId || accepting) return;
    setAccepting(true);
    if (audioRef.current) clearInterval(audioRef.current);
    if (navigator.vibrate) navigator.vibrate(0);

    try {
      if (course.source === 'queue') {
        await supabase
          .from('course_queue')
          .update({
            status: 'forced',
            resolved_at: new Date().toISOString(),
            resolved_action: 'forced_via_overlay',
            updated_at: new Date().toISOString(),
          })
          .eq('id', course.sourceId);
        toast.success('Course acceptée !');
      } else if (course.source === 'shared') {
        await supabase
          .from('shared_courses')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
          })
          .eq('id', course.sourceId);
        toast.success('Course partagée acceptée !');
      } else if (course.source === 'direct') {
        await supabase
          .from('courses')
          .update({
            status: 'accepted',
            updated_at: new Date().toISOString(),
          })
          .eq('id', course.sourceId);

        try {
          const { data: courseData } = await supabase
            .from('courses')
            .select('payment_method_requested, client_id')
            .eq('id', course.sourceId)
            .maybeSingle();

          if (courseData?.payment_method_requested === 'card' && courseData?.client_id) {
            supabase.functions.invoke('create-card-hold', {
              body: {
                driver_id: driverId,
                course_id: course.sourceId,
                client_id: courseData.client_id,
              },
            }).catch(err => console.error('Auto card hold failed:', err));
          }
        } catch (holdErr) {
          console.error('Card hold check failed:', holdErr);
        }

        toast.success('Course acceptée !');
      } else if (course.source === 'ride_request') {
        const { data, error } = await supabase.functions.invoke('accept-ride-request', {
          body: { ride_request_id: course.sourceId },
        });

        if (error) throw error;
        if (!data?.success) {
          if (data?.already_taken) {
            toast.error('Cette course a déjà été prise par un autre chauffeur');
          } else if (data?.expired) {
            toast.error('Cette demande a expiré');
          } else {
            toast.error(data?.error || "Erreur lors de l'acceptation");
          }
          await supabase.from('drivers').update({ 
            driver_status: 'online_available',
            is_available_now: true,
          }).eq('id', driverId);
          onDismiss();
          return;
        }
        toast.success('Course acceptée !');
      }

      await supabase.from('drivers').update({ 
        driver_status: 'on_trip',
        is_available_now: false,
      }).eq('id', driverId);

      onAccepted();
    } catch (err: any) {
      console.error('Error accepting course:', err);
      toast.error(err.message || "Erreur lors de l'acceptation");
      if (driverId) {
        await supabase.from('drivers').update({ 
          driver_status: 'online_available',
          is_available_now: true,
        }).eq('id', driverId);
      }
    } finally {
      setAccepting(false);
    }
  }, [course, driverId, accepting, onAccepted, onDismiss]);

  const handleDismiss = useCallback(async () => {
    if (audioRef.current) clearInterval(audioRef.current);
    if (navigator.vibrate) navigator.vibrate(0);

    if (driverId) {
      await supabase.from('drivers').update({ 
        driver_status: 'online_available',
        is_available_now: true,
      }).eq('id', driverId);
    }

    if (course?.source === 'ride_request' && course.sourceId) {
      try {
        await supabase
          .from('ride_requests')
          .update({ status: 'rejected' })
          .eq('id', course.sourceId);
      } catch (err) {
        console.error('Error rejecting ride request:', err);
      }
    }

    onDismiss();
  }, [course, driverId, onDismiss]);

  const progressPercent = (timeLeft / TIMEOUT_SECONDS) * 100;
  const isExclusive = course?.requestType === 'exclusive';
  const isMulti = course?.requestType === 'multi';

  const timerStroke = timeLeft > 40 ? '#22c55e' : timeLeft > 15 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - timeLeft / TIMEOUT_SECONDS);

  // Compute trip duration estimate
  const tripMinutes = course?.distanceKm ? estimateTripMinutes(course.distanceKm) : null;
  const paymentInfo = course ? getPaymentLabel(course.paymentMethod) : null;
  const PaymentIcon = paymentInfo?.icon || CreditCard;

  return (
    <AnimatePresence>
      {course && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[999999] flex flex-col bg-black text-white overflow-auto"
          style={{ touchAction: 'none' }}
        >
          {/* Top progress bar */}
          <div className="w-full h-2 bg-white/10">
            <motion.div
              className="h-full rounded-r-full"
              style={{ background: timerStroke }}
              initial={{ width: '100%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>

          <div className="flex-1 flex flex-col items-center px-4 py-4 max-w-md mx-auto w-full overflow-y-auto">
            {/* HEADER */}
            <motion.div
              className="text-center mb-3"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 20 }}
            >
              <div className="text-3xl mb-1">🚨</div>
              <h1 className="text-xl font-black tracking-tight">Nouvelle course</h1>
              {course.rideId && (
                <p className="text-[9px] text-white/30 font-mono mt-0.5">
                  ID: {course.rideId.slice(0, 8)}
                </p>
              )}

              {isExclusive ? (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-full">
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">Client exclusif</span>
                </div>
              ) : isMulti ? (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/40 rounded-full">
                  <Users className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-xs font-bold text-blue-300">Multi-chauffeurs</span>
                </div>
              ) : null}
            </motion.div>

            {/* TIMER */}
            <motion.div
              className="mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <motion.circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke={timerStroke}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: 'linear' }}
                    style={{ filter: `drop-shadow(0 0 8px ${timerStroke})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-black tabular-nums" style={{ color: timerStroke }}>
                    {timeLeft}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* APPROACH INFO — driver to pickup */}
            {approachInfo && (
              <motion.div
                className="w-full flex gap-2 mb-3"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.18 }}
              >
                <div className="flex-1 bg-cyan-500/15 border border-cyan-500/30 rounded-xl p-2.5 text-center">
                  <Car className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
                  <p className="text-[9px] text-cyan-300/70 uppercase tracking-wider font-medium">Approche</p>
                  <p className="text-lg font-black text-cyan-400">{approachInfo.distanceKm} km</p>
                </div>
                <div className="flex-1 bg-cyan-500/15 border border-cyan-500/30 rounded-xl p-2.5 text-center">
                  <Timer className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
                  <p className="text-[9px] text-cyan-300/70 uppercase tracking-wider font-medium">Temps approche</p>
                  <p className="text-lg font-black text-cyan-400">~{approachInfo.minutes} min</p>
                </div>
              </motion.div>
            )}

            {/* ROUTE */}
            <motion.div
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 mb-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center mt-1">
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                  <div className="w-0.5 h-7 bg-gradient-to-b from-green-500 to-blue-500 my-0.5" />
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div>
                    <p className="text-[9px] font-bold text-green-400 uppercase tracking-widest mb-0.5">Départ</p>
                    <p className="text-xs font-semibold leading-tight">{course.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">Destination</p>
                    <p className="text-xs font-semibold leading-tight">{course.destinationAddress}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* DETAILS GRID */}
            <motion.div
              className="w-full grid grid-cols-2 gap-2 mb-3"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              {/* Prix */}
              {course.amount != null && (
                <div className="bg-green-500/15 border border-green-500/30 rounded-xl p-2.5 text-center shadow-lg shadow-green-500/10">
                  <Euro className="h-4 w-4 text-green-400 mx-auto mb-1" />
                  <p className="text-[9px] text-green-300/70 uppercase tracking-wider font-medium">Prix</p>
                  <p className="text-2xl font-black text-green-400">{course.amount.toFixed(2)}€</p>
                </div>
              )}

              {/* Distance course */}
              {course.distanceKm != null && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                  <Route className="h-4 w-4 text-white/60 mx-auto mb-1" />
                  <p className="text-[9px] text-white/50 uppercase tracking-wider font-medium">Distance</p>
                  <p className="text-xl font-black">{course.distanceKm.toFixed(1)} km</p>
                </div>
              )}

              {/* Durée estimée */}
              {tripMinutes != null && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                  <Clock className="h-4 w-4 text-white/60 mx-auto mb-1" />
                  <p className="text-[9px] text-white/50 uppercase tracking-wider font-medium">Durée estimée</p>
                  <p className="text-xl font-black">~{tripMinutes} min</p>
                </div>
              )}

              {/* Mode de paiement */}
              {paymentInfo && course.paymentMethod && (
                <div className={`rounded-xl p-2.5 text-center border ${
                  course.paymentMethod === 'card' 
                    ? 'bg-purple-500/15 border-purple-500/30' 
                    : 'bg-yellow-500/15 border-yellow-500/30'
                }`}>
                  <PaymentIcon className={`h-4 w-4 mx-auto mb-1 ${
                    course.paymentMethod === 'card' ? 'text-purple-400' : 'text-yellow-400'
                  }`} />
                  <p className={`text-[9px] uppercase tracking-wider font-medium ${
                    course.paymentMethod === 'card' ? 'text-purple-300/70' : 'text-yellow-300/70'
                  }`}>Paiement</p>
                  <p className={`text-sm font-bold ${
                    course.paymentMethod === 'card' ? 'text-purple-400' : 'text-yellow-400'
                  }`}>{paymentInfo.label}</p>
                </div>
              )}

              {/* Date */}
              {course.scheduledDate && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                  <Calendar className="h-4 w-4 text-white/60 mx-auto mb-1" />
                  <p className="text-[9px] text-white/50 uppercase tracking-wider font-medium">Date</p>
                  <p className="text-sm font-bold">
                    {format(new Date(course.scheduledDate), "d MMM HH:mm", { locale: fr })}
                  </p>
                </div>
              )}

              {/* Client */}
              {course.clientName && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-center">
                  <User className="h-4 w-4 text-white/60 mx-auto mb-1" />
                  <p className="text-[9px] text-white/50 uppercase tracking-wider font-medium">Client</p>
                  <p className="text-sm font-bold truncate">{course.clientName}</p>
                </div>
              )}
            </motion.div>

            {course.senderDriverName && (
              <div className="flex items-center gap-2 text-xs text-white/50 mb-3">
                <Handshake className="h-3.5 w-3.5" />
                <span>Partagée par {course.senderDriverName}</span>
              </div>
            )}

            {/* SPACER */}
            <div className="flex-1 min-h-2" />

            {/* ACTION BUTTONS */}
            <motion.div
              className="w-full space-y-2.5"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                animate={{ boxShadow: ['0 0 20px rgba(34,197,94,0.4)', '0 0 40px rgba(34,197,94,0.6)', '0 0 20px rgba(34,197,94,0.4)'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="rounded-2xl"
              >
                <Button
                  className="w-full h-14 text-lg font-black rounded-2xl bg-green-500 hover:bg-green-600 text-white shadow-2xl active:scale-[0.97] transition-transform"
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? (
                    <div className="h-5 w-5 mr-2 animate-spin rounded-full border-3 border-white border-t-transparent" />
                  ) : (
                    <Check className="h-6 w-6 mr-2" />
                  )}
                  ACCEPTER
                </Button>
              </motion.div>

              <Button
                variant="ghost"
                className="w-full h-12 text-base font-bold rounded-2xl text-red-400 hover:bg-red-500/10 border border-red-500/30 active:scale-[0.97] transition-transform"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4 mr-2" />
                REFUSER
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
