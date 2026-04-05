import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSoloCabSound, SOLOCAB_VIBRATION_PATTERN } from '@/lib/solocabNotificationSound';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  MapPin,
  Calendar,
  Euro,
  User,
  X,
  Check,
  Share2,
  Clock,
  Zap,
  ArrowRight,
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

const TIMEOUT_SECONDS = 90;

export function IncomingCourseOverlay({
  course,
  onDismiss,
  onAccepted,
  driverId,
}: IncomingCourseOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECONDS);
  const [accepting, setAccepting] = useState(false);

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

  // Vibrate + sound on new course
  useEffect(() => {
    if (!course) return;
    // Vibration pattern SoloCab signature
    if (navigator.vibrate) {
      navigator.vibrate(SOLOCAB_VIBRATION_PATTERN);
    }
    // Play SoloCab notification sound
    playSoloCabSound(0.8).catch(() => {});
  }, [course?.id]);

  const handleAccept = useCallback(async () => {
    if (!course || !driverId || accepting) return;
    setAccepting(true);

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
        toast.success('Course acceptée !');
      } else if (course.source === 'ride_request') {
        // Use the atomic accept Edge Function
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

  const progressPercent = (timeLeft / TIMEOUT_SECONDS) * 100;

  // Determine if exclusive or multi request
  const isExclusive = course?.requestType === 'exclusive';
  const isMulti = course?.requestType === 'multi';

  const sourceLabel: Record<string, string> = {
    direct: 'Nouvelle course',
    shared: 'Course partagée',
    queue: "File d'attente",
    fleet: 'Course flotte',
    ride_request: isExclusive ? 'Demande exclusive' : isMulti ? 'Demande multiple' : 'Demande de course',
  };

  const sourceIcon: Record<string, JSX.Element> = {
    direct: <Zap className="h-4 w-4" />,
    shared: <Handshake className="h-4 w-4" />,
    queue: <Clock className="h-4 w-4" />,
    fleet: <Navigation className="h-4 w-4" />,
    ride_request: isExclusive ? <Crown className="h-4 w-4" /> : <Users className="h-4 w-4" />,
  };

  // Timer color based on urgency
  const timerColor = timeLeft > 60 ? 'text-green-500' : timeLeft > 30 ? 'text-amber-500' : 'text-red-500';
  const progressColor = timeLeft > 60
    ? 'from-green-500 to-emerald-500'
    : timeLeft > 30
    ? 'from-amber-400 to-orange-500'
    : 'from-red-500 to-rose-600';

  return (
    <AnimatePresence>
      {course && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-[9999] flex flex-col justify-end pointer-events-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={onDismiss}
          />

          {/* Overlay Card */}
          <motion.div
            className="relative pointer-events-auto bg-card border-t-2 border-primary rounded-t-3xl shadow-2xl mx-0 pb-safe"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
          >
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-muted rounded-t-3xl overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${progressColor}`}
                initial={{ width: '100%' }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="px-5 pb-6 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    className={`gap-1 ${
                      isExclusive
                        ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                        : isMulti
                        ? 'bg-blue-500/20 text-blue-500 border-blue-500/30'
                        : 'bg-primary/20 text-primary border-primary/30'
                    }`}
                  >
                    {sourceIcon[course.source]}
                    {sourceLabel[course.source] || 'Course'}
                  </Badge>
                  <Badge variant="outline" className={`text-xs gap-1 ${timerColor}`}>
                    <Clock className="h-3 w-3" />
                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={onDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Exclusive/Multi context message */}
              {isExclusive && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Le client vous a choisi exclusivement
                  </p>
                </div>
              )}
              {isMulti && course.driverCount && course.driverCount > 1 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <Users className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Envoyée à {course.driverCount} chauffeurs · Premier qui accepte
                  </p>
                </div>
              )}

              {/* Route */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-green-400" />
                    <div className="w-0.5 h-8 bg-gradient-to-b from-green-500 to-primary" />
                    <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary/70" />
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <div>
                      <p className="text-xs text-muted-foreground">Départ</p>
                      <p className="text-sm font-medium truncate">{course.pickupAddress}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Arrivée</p>
                      <p className="text-sm font-medium truncate">{course.destinationAddress}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details row */}
              <div className="flex items-center gap-3 flex-wrap">
                {course.scheduledDate && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {format(new Date(course.scheduledDate), "d MMM 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                )}

                {course.clientName && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>{course.clientName}</span>
                  </div>
                )}

                {course.senderDriverName && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Handshake className="h-3.5 w-3.5" />
                    <span>de {course.senderDriverName}</span>
                  </div>
                )}

                {course.distanceKm && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Navigation className="h-3.5 w-3.5" />
                    <span>{course.distanceKm.toFixed(1)} km</span>
                  </div>
                )}
              </div>

              {/* Amount */}
              {course.amount && (
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl">
                  <span className="text-sm text-muted-foreground">Montant</span>
                  <div className="flex items-center gap-2">
                    {course.commissionPercentage && (
                      <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                        -{course.commissionPercentage}% commission
                      </Badge>
                    )}
                    <span className="text-xl font-bold text-green-500 flex items-center">
                      <Euro className="h-5 w-5 mr-0.5" />
                      {course.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Button
                  variant="outline"
                  className="h-14 text-base border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={onDismiss}
                >
                  <X className="h-5 w-5 mr-2" />
                  Refuser
                </Button>

                <Button
                  className="h-14 text-base bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25"
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? (
                    <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Check className="h-5 w-5 mr-2" />
                  )}
                  Accepter
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
