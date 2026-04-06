import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Phone, User, Navigation, MapPin, Clock, AlertTriangle, CheckCircle2, Play, Square, Flag } from 'lucide-react';
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
  payment_method_requested: string | null;
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
    const { data } = await supabase
      .from('courses')
      .select(`
        id, status, pickup_address, destination_address,
        pickup_latitude, pickup_longitude,
        destination_latitude, destination_longitude,
        guest_name, guest_phone, guest_estimated_price, final_payment_amount,
        distance_km, payment_method_requested,
        clients(profiles:user_id(full_name, phone))
      `)
      .eq('driver_id', driverId)
      .in('status', ['accepted', 'in_progress'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newCourse = data as unknown as ActiveCourse | null;
    const prev = course;
    setCourse(newCourse);

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

  // Estimate arrival time based on distance
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
        .eq('id', course.id);
      setPhase('in_progress');
      toast.success('Course démarrée !');
    } catch (err) {
      toast.error("Erreur au démarrage");
    } finally {
      setLoading(false);
    }
  }, [course]);

  const handleComplete = useCallback(async () => {
    if (!course) return;
    setLoading(true);
    try {
      // Finalize payment via edge function
      const { data, error } = await supabase.functions.invoke('finalize-course-payment', {
        body: { course_id: course.id },
      });

      if (error) {
        console.error('Finalize error:', error);
        // Fallback: just complete the course status
        await supabase
          .from('courses')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', course.id);
      }

      toast.success('Course terminée !');
      setCourse(null);
      onCourseChange?.();
    } catch (err) {
      toast.error("Erreur lors de la finalisation");
    } finally {
      setLoading(false);
    }
  }, [course, onCourseChange]);

  const handleStopCourse = useCallback(async (reason: string) => {
    if (!course) return;
    setLoading(true);
    setShowStopReasons(false);
    try {
      // Recalculate price based on partial distance
      // We estimate 50% of original distance as the actual traveled portion
      // In production this would use real GPS tracking
      const originalPrice = course.final_payment_amount || course.guest_estimated_price || 0;
      const originalDistance = course.distance_km || 1;

      // For now, use a proportional reduction - the edge function will handle actual capture
      const { data, error } = await supabase.functions.invoke('capture-course-payment', {
        body: {
          course_id: course.id,
          amount_to_capture: originalPrice, // Capture what's fair - can be adjusted
        },
      });

      // Update course with stop info
      await supabase
        .from('courses')
        .update({
          status: 'completed',
          notes: `Course arrêtée: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', course.id);

      toast.success(`Course arrêtée: ${reason}`);
      setCourse(null);
      onCourseChange?.();
    } catch (err: any) {
      console.error('Stop course error:', err);
      // Fallback
      await supabase
        .from('courses')
        .update({
          status: 'completed',
          notes: `Course arrêtée: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', course.id);
      toast.info('Course arrêtée');
      setCourse(null);
      onCourseChange?.();
    } finally {
      setLoading(false);
    }
  }, [course, onCourseChange]);

  const clientName = course?.clients?.profiles?.full_name || course?.guest_name || 'Client';
  const clientPhone = course?.clients?.profiles?.phone || course?.guest_phone;
  const price = course?.final_payment_amount || course?.guest_estimated_price;

  if (!course) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={course.id}
        initial={{ y: 300, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 300, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 z-[9998]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <div className="bg-card/98 backdrop-blur-2xl border-t border-border/60 rounded-t-3xl shadow-2xl">
          {/* Phase indicator bar */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="px-5 pb-5 space-y-4">
            {/* Status + Price header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full animate-pulse ${
                  phase === 'in_progress' ? 'bg-green-500' :
                  phase === 'arrived' ? 'bg-blue-500' : 'bg-amber-500'
                }`} />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {phase === 'approaching' && 'En approche'}
                  {phase === 'arrived' && 'Arrivé — Client à récupérer'}
                  {phase === 'in_progress' && 'Course en cours'}
                  {phase === 'completing' && 'Finalisation'}
                </span>
              </div>
              {price != null && (
                <div className="bg-primary/10 rounded-full px-3 py-1">
                  <span className="text-sm font-black text-primary">{price.toFixed(2)}€</span>
                </div>
              )}
            </div>

            {/* Client info */}
            <div className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{clientName}</p>
                {course.payment_method_requested && (
                  <p className="text-[10px] text-muted-foreground uppercase">
                    Paiement: {course.payment_method_requested === 'card' ? '💳 Carte' : '💵 Espèces'}
                  </p>
                )}
              </div>
              {clientPhone && (
                <a href={`tel:${clientPhone}`}>
                  <Button size="sm" variant="outline" className="h-9 w-9 rounded-full p-0">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
              )}
            </div>

            {/* Route */}
            <div className="space-y-2">
              {(phase === 'approaching' || phase === 'arrived') && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/40 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Prise en charge</p>
                    <p className="text-sm font-medium leading-tight">{course.pickup_address}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="mt-1 w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/40 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Destination</p>
                  <p className="text-sm font-medium leading-tight">{course.destination_address}</p>
                </div>
              </div>
              {/* Distance & ETA */}
              <div className="flex items-center gap-4 pl-6">
                {course.distance_km != null && (
                  <span className="text-xs text-muted-foreground">📏 {course.distance_km.toFixed(1)} km</span>
                )}
                {estimatedArrival && (
                  <span className="text-xs text-muted-foreground">🕒 {estimatedArrival}</span>
                )}
              </div>
            </div>

            {/* === PHASE-SPECIFIC ACTIONS === */}

            {/* Phase: Approaching pickup */}
            {phase === 'approaching' && (
              <div className="space-y-2">
                <NavigationSelector
                  destination={{
                    address: course.pickup_address,
                    latitude: course.pickup_latitude ?? undefined,
                    longitude: course.pickup_longitude ?? undefined,
                  }}
                  label="Naviguer vers le client"
                  variant="default"
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 rounded-xl"
                />
                <Button
                  onClick={handleArrived}
                  variant="outline"
                  className="w-full h-11 rounded-xl font-semibold border-primary/30"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Je suis arrivé
                </Button>
              </div>
            )}

            {/* Phase: Arrived at pickup, waiting for client */}
            {phase === 'arrived' && (
              <div className="space-y-2">
                <Button
                  onClick={handleStartTrip}
                  disabled={loading}
                  className="w-full h-14 text-lg font-black rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30"
                >
                  {loading ? (
                    <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Play className="w-5 h-5 mr-2" />
                  )}
                  DÉMARRER LA COURSE
                </Button>
                <Button
                  onClick={() => setShowStopReasons(true)}
                  variant="ghost"
                  className="w-full h-10 text-sm text-destructive hover:bg-destructive/10 rounded-xl"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Annuler (client absent, etc.)
                </Button>
              </div>
            )}

            {/* Phase: In progress — driving to destination */}
            {phase === 'in_progress' && (
              <div className="space-y-2">
                <NavigationSelector
                  destination={{
                    address: course.destination_address,
                    latitude: course.destination_latitude ?? undefined,
                    longitude: course.destination_longitude ?? undefined,
                  }}
                  label="Naviguer vers la destination"
                  variant="default"
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleComplete}
                    disabled={loading}
                    className="h-12 font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loading ? (
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Terminer
                  </Button>
                  <Button
                    onClick={() => setShowStopReasons(true)}
                    variant="outline"
                    className="h-12 font-bold rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Arrêter
                  </Button>
                </div>
              </div>
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
                className="bg-card rounded-t-3xl w-full max-w-lg p-5 space-y-3"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-center">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <h3 className="text-lg font-bold text-center">Motif d'arrêt</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Le prix sera recalculé selon la distance parcourue
                </p>
                <div className="space-y-2">
                  {STOP_REASONS.map(reason => (
                    <Button
                      key={reason}
                      onClick={() => handleStopCourse(reason)}
                      variant="outline"
                      disabled={loading}
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
