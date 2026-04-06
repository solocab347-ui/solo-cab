import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSoloCabSound, SOLOCAB_VIBRATION_PATTERN } from '@/lib/solocabNotificationSound';
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

export function IncomingCourseOverlay({
  course,
  onDismiss,
  onAccepted,
  driverId,
}: IncomingCourseOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECONDS);
  const [accepting, setAccepting] = useState(false);
  const audioRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    if (!course) {
      setTimeLeft(TIMEOUT_SECONDS);
      return;
    }
    setTimeLeft(TIMEOUT_SECONDS);

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

  // Sound + vibration on new course — repeat sound every 3s for urgency
  useEffect(() => {
    if (!course) return;

    // Initial vibration
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 300]);
    }
    // Initial sound — MAX volume
    playSoloCabSound(1.0).catch(() => {});

    // Repeat sound every 2.5 seconds for more urgency
    const soundInterval = setInterval(() => {
      playSoloCabSound(1.0).catch(() => {});
      if (navigator.vibrate) {
        navigator.vibrate([200, 80, 200]);
      }
    }, 2500);
    audioRef.current = soundInterval;

    return () => {
      clearInterval(soundInterval);
      if (navigator.vibrate) navigator.vibrate(0);
    };
  }, [course?.id]);

  const handleAccept = useCallback(async () => {
    if (!course || !driverId || accepting) return;
    setAccepting(true);
    // Stop sound immediately
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

        // Déclencher l'empreinte bancaire si paiement par carte
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
          onDismiss();
          return;
        }
        toast.success('Course acceptée !');
      }

      onAccepted();
    } catch (err: any) {
      console.error('Error accepting course:', err);
      toast.error(err.message || "Erreur lors de l'acceptation");
    } finally {
      setAccepting(false);
    }
  }, [course, driverId, accepting, onAccepted, onDismiss]);

  const handleDismiss = useCallback(async () => {
    if (audioRef.current) clearInterval(audioRef.current);
    if (navigator.vibrate) navigator.vibrate(0);

    // Marquer la ride_request comme refusée pour tracking
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
  }, [course, onDismiss]);

  const progressPercent = (timeLeft / TIMEOUT_SECONDS) * 100;
  const isExclusive = course?.requestType === 'exclusive';
  const isMulti = course?.requestType === 'multi';

  // Timer ring color
  const timerStroke = timeLeft > 40 ? '#22c55e' : timeLeft > 15 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - timeLeft / TIMEOUT_SECONDS);

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

          <div className="flex-1 flex flex-col items-center justify-center px-5 py-6 max-w-md mx-auto w-full">
            {/* HEADER */}
            <motion.div
              className="text-center mb-5"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 20 }}
            >
              <div className="text-4xl mb-2">🚨</div>
              <h1 className="text-2xl font-black tracking-tight">
                Nouvelle course
              </h1>

              {isExclusive ? (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/40 rounded-full">
                  <Crown className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-300">Client exclusif</span>
                </div>
              ) : isMulti ? (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/40 rounded-full">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-bold text-blue-300">Multi-chauffeurs</span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/50">
                  {TIMEOUT_SECONDS}s pour répondre
                </p>
              )}
            </motion.div>

            {/* TIMER */}
            <motion.div
              className="mb-5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                  <motion.circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke={timerStroke}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-black tabular-nums" style={{ color: timerStroke }}>
                    {timeLeft}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* ROUTE — centered card */}
            <motion.div
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center mt-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
                  <div className="w-0.5 h-8 bg-gradient-to-b from-green-500 to-blue-500 my-1" />
                  <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
                </div>
                <div className="flex-1 space-y-3 min-w-0">
                  <div>
                    <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-0.5">Départ</p>
                    <p className="text-sm font-semibold leading-tight">{course.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">Destination</p>
                    <p className="text-sm font-semibold leading-tight">{course.destinationAddress}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* DETAILS — centered grid */}
            <motion.div
              className="w-full grid grid-cols-2 gap-2.5 mb-4"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              {course.amount != null && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-green-300/70 uppercase tracking-wider font-medium mb-1">Prix</p>
                  <p className="text-2xl font-black text-green-400">{course.amount.toFixed(2)}€</p>
                </div>
              )}
              {course.distanceKm != null && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium mb-1">Distance</p>
                  <p className="text-2xl font-black">{course.distanceKm.toFixed(1)} km</p>
                </div>
              )}
              {course.scheduledDate && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium mb-1">Date</p>
                  <p className="text-base font-bold">
                    {format(new Date(course.scheduledDate), "d MMM HH:mm", { locale: fr })}
                  </p>
                </div>
              )}
              {course.clientName && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium mb-1">Client</p>
                  <p className="text-base font-bold truncate">{course.clientName}</p>
                </div>
              )}
            </motion.div>

            {course.senderDriverName && (
              <div className="flex items-center gap-2 text-sm text-white/50 mb-4">
                <Handshake className="h-4 w-4" />
                <span>Partagée par {course.senderDriverName}</span>
              </div>
            )}

            {/* SPACER */}
            <div className="flex-1 min-h-4" />

            {/* ACTION BUTTONS */}
            <motion.div
              className="w-full space-y-3"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                className="w-full h-16 text-xl font-black rounded-2xl bg-green-500 hover:bg-green-600 text-white shadow-2xl shadow-green-500/40 active:scale-[0.97] transition-transform"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <div className="h-6 w-6 mr-3 animate-spin rounded-full border-3 border-white border-t-transparent" />
                ) : (
                  <Check className="h-7 w-7 mr-3" />
                )}
                ACCEPTER
              </Button>

              <Button
                variant="ghost"
                className="w-full h-14 text-lg font-bold rounded-2xl text-red-400 hover:bg-red-500/10 border border-red-500/30 active:scale-[0.97] transition-transform"
                onClick={handleDismiss}
              >
                <X className="h-5 w-5 mr-2" />
                REFUSER
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
