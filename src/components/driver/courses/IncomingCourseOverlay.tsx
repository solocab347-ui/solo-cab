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
    // Initial sound
    playSoloCabSound(1.0).catch(() => {});

    // Repeat sound every 3 seconds
    const soundInterval = setInterval(() => {
      playSoloCabSound(0.7).catch(() => {});
      if (navigator.vibrate) {
        navigator.vibrate([200, 80, 200]);
      }
    }, 3000);
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

  const handleDismiss = useCallback(() => {
    if (audioRef.current) clearInterval(audioRef.current);
    if (navigator.vibrate) navigator.vibrate(0);
    onDismiss();
  }, [onDismiss]);

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
          <div className="w-full h-1.5 bg-white/10">
            <motion.div
              className="h-full"
              style={{ background: timerStroke }}
              initial={{ width: '100%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>

          <div className="flex-1 flex flex-col px-6 pt-6 pb-8 max-w-lg mx-auto w-full">
            {/* HEADER */}
            <div className="text-center mb-6">
              <motion.h1
                className="text-2xl font-black tracking-tight"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 20 }}
              >
                🚨 Nouvelle course disponible
              </motion.h1>

              {/* Context message */}
              {isExclusive ? (
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl"
                >
                  <Crown className="h-5 w-5 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-300">
                    Le client vous a choisi. Vous avez {TIMEOUT_SECONDS}s.
                  </span>
                </motion.div>
              ) : isMulti ? (
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/20 border border-blue-500/30 rounded-xl"
                >
                  <Users className="h-5 w-5 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-300">
                    Plusieurs chauffeurs contactés. Premier accepté.
                  </span>
                </motion.div>
              ) : (
                <p className="mt-2 text-sm text-white/60">
                  Vous avez {TIMEOUT_SECONDS} secondes pour répondre
                </p>
              )}
            </div>

            {/* TIMER - Circular */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                  <motion.circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke={timerStroke}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-black tabular-nums" style={{ color: timerStroke }}>
                    {timeLeft}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* ROUTE INFO */}
            <motion.div
              className="space-y-4 mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              {/* Pickup */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center mt-1.5">
                  <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-300 shadow-lg shadow-green-500/50" />
                  <div className="w-0.5 h-10 bg-gradient-to-b from-green-500 to-blue-500" />
                  <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-300 shadow-lg shadow-blue-500/50" />
                </div>
                <div className="flex-1 space-y-3 min-w-0">
                  <div>
                    <p className="text-xs font-medium text-green-400 uppercase tracking-wider">📍 Départ</p>
                    <p className="text-base font-semibold truncate">{course.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">📍 Destination</p>
                    <p className="text-base font-semibold truncate">{course.destinationAddress}</p>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                {course.amount && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-xs text-white/50 mb-1">💰 Prix</p>
                    <p className="text-2xl font-black text-green-400">{course.amount.toFixed(2)}€</p>
                  </div>
                )}
                {course.distanceKm && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-xs text-white/50 mb-1">📏 Distance</p>
                    <p className="text-2xl font-black">{course.distanceKm.toFixed(1)} km</p>
                  </div>
                )}
                {course.scheduledDate && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-xs text-white/50 mb-1">🕒 Date</p>
                    <p className="text-sm font-bold">
                      {format(new Date(course.scheduledDate), "d MMM HH:mm", { locale: fr })}
                    </p>
                  </div>
                )}
                {course.clientName && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-xs text-white/50 mb-1">👤 Client</p>
                    <p className="text-sm font-bold truncate">{course.clientName}</p>
                  </div>
                )}
              </div>

              {course.senderDriverName && (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Handshake className="h-4 w-4" />
                  <span>Partagée par {course.senderDriverName}</span>
                </div>
              )}
            </motion.div>

            {/* SPACER */}
            <div className="flex-1" />

            {/* ACTION BUTTONS */}
            <motion.div
              className="space-y-3"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <Button
                className="w-full h-16 text-xl font-black rounded-2xl bg-green-500 hover:bg-green-600 text-white shadow-2xl shadow-green-500/30 active:scale-[0.97] transition-transform"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <div className="h-6 w-6 mr-3 animate-spin rounded-full border-3 border-white border-t-transparent" />
                ) : (
                  <Check className="h-6 w-6 mr-3" />
                )}
                ACCEPTER
              </Button>

              <Button
                variant="ghost"
                className="w-full h-14 text-lg font-bold rounded-2xl text-red-400 hover:bg-red-500/10 border border-red-500/20 active:scale-[0.97] transition-transform"
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
