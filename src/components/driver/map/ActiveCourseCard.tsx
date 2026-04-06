import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Phone, User, Clock, AlertTriangle, CheckCircle2, Play, Square, Flag, Euro, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { NavigationSelector } from '@/components/NavigationSelector';
import { toast } from 'sonner';

interface ActiveCourse {
  id: string;
  status: string;
  pickup_address: string;
  destination_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_estimated_price: number | null;
  final_payment_amount: number | null;
  distance_km: number | null;
  payment_method: string | null;
  driver_id: string;
  clients: { profiles: { full_name: string; phone: string | null } | null } | null;
}

type CoursePhase = 'approaching' | 'arrived' | 'in_progress' | 'completing';

interface ActiveCourseCardProps {
  driverId: string;
  onCourseChange?: () => void;
  onCourseActive?: (active: boolean) => void;
}

const STOP_REASONS = [
  'Client absent',
  'Changement de destination',
  'Problème de sécurité',
  'Demande du client',
  'Problème véhicule',
  'Autre',
];

export function ActiveCourseCard({ driverId, onCourseChange, onCourseActive }: ActiveCourseCardProps) {
  const [course, setCourse] = useState<ActiveCourse | null>(null);
  const [phase, setPhase] = useState<CoursePhase>('approaching');
  const [loading, setLoading] = useState(false);
  const [showStopReasons, setShowStopReasons] = useState(false);
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);

  const fetchActive = useCallback(async () => {
    if (!driverId) return;

    const { data, error } = await supabase
      .from('courses')
      .select(`
        id, status, pickup_address, destination_address,
        pickup_latitude, pickup_longitude,
        destination_latitude, destination_longitude,
        guest_name, guest_phone, guest_estimated_price, final_payment_amount,
        distance_km, payment_method, driver_id,
        clients(profiles:user_id(full_name, phone))
      `)
      .eq('driver_id', driverId)
      .in('status', ['accepted', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[ActiveCourseCard] fetch error:', error);
      return;
    }

    const newCourse = data as unknown as ActiveCourse | null;

    // Double-check driver_id matches to prevent cross-driver leaks
    if (newCourse && newCourse.driver_id !== driverId) {
      console.warn('[ActiveCourseCard] driver_id mismatch, ignoring course', {
        expected: driverId,
        got: newCourse.driver_id,
      });
      setCourse(null);
      onCourseActive?.(false);
      return;
    }

    const prev = course;
    setCourse(newCourse);
    onCourseActive?.(!!newCourse);

    if (newCourse) {
      if (newCourse.status === 'in_progress') {
        setPhase('in_progress');
      } else if (newCourse.status === 'accepted' && phase !== 'arrived') {
        setPhase('approaching');
      }
    }

    if (prev && !newCourse) {
      onCourseChange?.();
    }
  }, [driverId, onCourseChange, course, phase]);

  useEffect(() => {
    fetchActive();
    const pollInterval = setInterval(fetchActive, 5000);
    const channel = supabase
      .channel(`active-course-${driverId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'courses',
        filter: `driver_id=eq.${driverId}`,
      }, () => fetchActive())
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  useEffect(() => {
    if (!course) return;
    const dist = course.distance_km;
    if (dist && dist > 0) {
      const avgSpeed = dist < 5 ? 25 : dist < 15 ? 40 : 60;
      const minutes = Math.round((dist / avgSpeed) * 60);
      setEstimatedArrival(`~${minutes} min`);
    } else {
      setEstimatedArrival(null);
    }
  }, [course?.distance_km]);

  const handleArrived = useCallback(async () => {
    setPhase('arrived');
    toast.success('Vous êtes arrivé au point de prise en charge');
  }, []);

  const handleStartTrip = useCallback(async () => {
    if (!course) return;
    setLoading(true);
    try {
      await supabase
        .from('courses')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', course.id)
        .eq('driver_id', driverId); // Extra safety
      setPhase('in_progress');
      toast.success('Course démarrée !');
    } catch {
      toast.error("Erreur au démarrage");
    } finally {
      setLoading(false);
    }
  }, [course, driverId]);

  const handleComplete = useCallback(async () => {
    if (!course) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('finalize-course-payment', {
        body: { course_id: course.id },
      });
      if (error) {
        await supabase
          .from('courses')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', course.id)
          .eq('driver_id', driverId);
      }
      toast.success('Course terminée !');
      setCourse(null);
      onCourseChange?.();
    } catch {
      toast.error("Erreur lors de la finalisation");
    } finally {
      setLoading(false);
    }
  }, [course, driverId, onCourseChange]);

  const handleStopCourse = useCallback(async (reason: string) => {
    if (!course) return;
    setLoading(true);
    setShowStopReasons(false);
    try {
      const originalPrice = course.final_payment_amount || course.guest_estimated_price || 0;
      await supabase.functions.invoke('capture-course-payment', {
        body: { course_id: course.id, amount_to_capture: originalPrice },
      });
      await supabase
        .from('courses')
        .update({ status: 'completed', notes: `Course arrêtée: ${reason}`, updated_at: new Date().toISOString() })
        .eq('id', course.id)
        .eq('driver_id', driverId);
      toast.success(`Course arrêtée: ${reason}`);
      setCourse(null);
      onCourseChange?.();
    } catch {
      await supabase
        .from('courses')
        .update({ status: 'completed', notes: `Course arrêtée: ${reason}`, updated_at: new Date().toISOString() })
        .eq('id', course.id)
        .eq('driver_id', driverId);
      toast.info('Course arrêtée');
      setCourse(null);
      onCourseChange?.();
    } finally {
      setLoading(false);
    }
  }, [course, driverId, onCourseChange]);

  const clientName = course?.clients?.profiles?.full_name || course?.guest_name || 'Client';
  const clientPhone = course?.clients?.profiles?.phone || course?.guest_phone;
  const price = course?.final_payment_amount || course?.guest_estimated_price;
  const paymentLabel = course?.payment_method === 'stripe' || course?.payment_method === 'card'
    ? '💳 Paiement carte' : '💵 Paiement espèces';

  if (!course) return null;

  const phaseLabel = phase === 'approaching' ? 'En approche' : phase === 'arrived' ? 'Client à récupérer' : phase === 'in_progress' ? 'Course en cours' : 'Finalisation';
  const phaseColor = phase === 'in_progress' ? 'bg-emerald-500' : phase === 'arrived' ? 'bg-blue-500' : 'bg-amber-500';

  return (
    <AnimatePresence>
      <motion.div
        key={course.id}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[9998] flex flex-col overflow-y-auto"
        style={{
          top: '80px',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        }}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-card border-t border-border" />

        <div className="relative flex flex-col flex-1">
          {/* Phase status header */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-3 h-3 rounded-full animate-pulse ${phaseColor}`} />
                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{phaseLabel}</span>
              </div>
              {price != null && (
                <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-4 py-1.5">
                  <Euro className="w-4 h-4 text-emerald-500" />
                  <span className="text-lg font-black text-emerald-500">{price.toFixed(2)}€</span>
                </div>
              )}
            </div>
          </div>

          {/* Client card */}
          <div className="mx-5 mb-4 bg-muted/50 border border-border rounded-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-foreground truncate">{clientName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{paymentLabel}</p>
              </div>
              {clientPhone && (
                <a href={`tel:${clientPhone}`}>
                  <Button size="icon" className="h-12 w-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                    <Phone className="w-5 h-5" />
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Route details */}
          <div className="mx-5 mb-4 bg-muted/50 border border-border rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-1.5">
                <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                <div className="w-0.5 h-10 bg-gradient-to-b from-emerald-500 to-blue-500 my-1" />
                <div className="w-4 h-4 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
              </div>
              <div className="flex-1 space-y-4 min-w-0">
                {(phase === 'approaching' || phase === 'arrived') && (
                  <div>
                    <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Prise en charge</p>
                    <p className="text-[15px] font-semibold text-foreground leading-snug">{course.pickup_address}</p>
                  </div>
                )}
                {phase === 'in_progress' && (
                  <div>
                    <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Départ</p>
                    <p className="text-[15px] font-semibold text-muted-foreground leading-snug">{course.pickup_address}</p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-1">Destination</p>
                  <p className="text-[15px] font-semibold text-foreground leading-snug">{course.destination_address}</p>
                </div>
              </div>
            </div>

            {/* Distance & ETA */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
              {course.distance_km != null && (
                <div className="flex items-center gap-1.5">
                  <Route className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">{course.distance_km.toFixed(1)} km</span>
                </div>
              )}
              {estimatedArrival && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-bold text-foreground">{estimatedArrival}</span>
                </div>
              )}
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-h-4" />

          {/* === PHASE ACTIONS === */}
          <div className="px-5 pb-5 space-y-3">
            {phase === 'approaching' && (
              <>
                <NavigationSelector
                  destination={{
                    address: course.pickup_address,
                    latitude: course.pickup_latitude ?? undefined,
                    longitude: course.pickup_longitude ?? undefined,
                  }}
                  label="Naviguer vers le client"
                  variant="default"
                  className="w-full h-14 text-base font-black rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-xl shadow-blue-500/30"
                />
                <Button
                  onClick={handleArrived}
                  variant="outline"
                  className="w-full h-13 rounded-2xl font-bold text-base border-border"
                >
                  <Flag className="w-5 h-5 mr-2 text-amber-500" />
                  Je suis arrivé
                </Button>
              </>
            )}

            {phase === 'arrived' && (
              <>
                <Button
                  onClick={handleStartTrip}
                  disabled={loading}
                  className="w-full h-16 text-xl font-black rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xl shadow-emerald-500/40 active:scale-[0.97] transition-transform"
                >
                  {loading ? (
                    <div className="h-6 w-6 mr-3 animate-spin rounded-full border-3 border-white border-t-transparent" />
                  ) : (
                    <Play className="w-6 h-6 mr-3" />
                  )}
                  DÉMARRER LA COURSE
                </Button>
                <Button
                  onClick={() => setShowStopReasons(true)}
                  variant="ghost"
                  className="w-full h-12 text-sm text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-2xl"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Annuler (client absent, etc.)
                </Button>
              </>
            )}

            {phase === 'in_progress' && (
              <>
                <NavigationSelector
                  destination={{
                    address: course.destination_address,
                    latitude: course.destination_latitude ?? undefined,
                    longitude: course.destination_longitude ?? undefined,
                  }}
                  label="Naviguer vers la destination"
                  variant="default"
                  className="w-full h-14 text-base font-black rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-xl shadow-emerald-500/30"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleComplete}
                    disabled={loading}
                    className="h-14 text-base font-black rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                  >
                    {loading ? (
                      <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                    )}
                    Terminer
                  </Button>
                  <Button
                    onClick={() => setShowStopReasons(true)}
                    variant="outline"
                    className="h-14 text-base font-bold rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Arrêter
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stop reasons modal */}
        <AnimatePresence>
          {showStopReasons && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99999] bg-black/60 flex items-end justify-center"
              onClick={() => setShowStopReasons(false)}
            >
              <motion.div
                initial={{ y: 300 }}
                animate={{ y: 0 }}
                exit={{ y: 300 }}
                className="w-full max-w-lg bg-card rounded-t-3xl p-5 space-y-3 border-t border-border"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-center">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <h3 className="text-lg font-bold text-center text-foreground">Motif d'arrêt</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Le prix sera recalculé selon la distance parcourue
                </p>
                <div className="space-y-2">
                  {STOP_REASONS.map(reason => (
                    <Button
                      key={reason}
                      onClick={() => handleStopCourse(reason)}
                      disabled={loading}
                      variant="outline"
                      className="w-full h-12 justify-start text-left font-medium rounded-xl"
                    >
                      <AlertTriangle className="w-4 h-4 mr-3 text-amber-500" />
                      {reason}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={() => setShowStopReasons(false)}
                  variant="ghost"
                  className="w-full mt-2 rounded-xl"
                >
                  Annuler
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
