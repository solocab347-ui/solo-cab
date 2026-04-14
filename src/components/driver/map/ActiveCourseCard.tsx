import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Phone, User, Clock, AlertTriangle, CheckCircle2, Play, Square, Flag, Euro, Route, MessageCircle, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { NavigationSelector } from '@/components/NavigationSelector';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CourseCompletionScreen } from '@/components/driver/courses/CourseCompletionScreen';
import { RideChatPanel } from '@/components/chat/RideChatPanel';

interface ActiveCourse {
  id: string;
  status: string;
   created_at: string;
   updated_at: string | null;
   scheduled_date: string | null;
   course_number: string | null;
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
   payment_method_requested: string | null;
  driver_id: string;
  clients: { profiles: { full_name: string; phone: string | null } | null } | null;
   devis: Array<{
    amount: number | null;
    status: string | null;
    accepted_at: string | null;
    created_at: string;
  }> | null;
}

type CoursePhase = 'approaching' | 'arrived' | 'in_progress' | 'completing';

const PHASE_ORDER: Record<CoursePhase, number> = {
  approaching: 0,
  arrived: 1,
  in_progress: 2,
  completing: 3,
};

function loadPersistedPhase(courseId: string): CoursePhase | null {
  try {
    const raw = localStorage.getItem(`solocab_phase_${courseId}`);
    if (raw && raw in PHASE_ORDER) return raw as CoursePhase;
  } catch {}
  return null;
}

function persistPhase(courseId: string, phase: CoursePhase) {
  try {
    localStorage.setItem(`solocab_phase_${courseId}`, phase);
  } catch {}
}

function clearPersistedPhase(courseId: string) {
  try {
    localStorage.removeItem(`solocab_phase_${courseId}`);
  } catch {}
}

/** Only advance phase forward, never regress */
function advancePhase(current: CoursePhase, candidate: CoursePhase): CoursePhase {
  return PHASE_ORDER[candidate] > PHASE_ORDER[current] ? candidate : current;
}

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

// Only show courses that are relevant RIGHT NOW
const isCourseTodayOrImmediate = (course: ActiveCourse) => {
  // in_progress courses always show
  if (course.status === 'in_progress') return true;
  
  // For accepted/pending: only show if scheduled today or earlier (not future)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  const scheduledDate = course.scheduled_date ? new Date(course.scheduled_date) : null;
  
  // If scheduled in the past (before today start) and not in_progress → expired, don't show
  if (scheduledDate && scheduledDate < todayStart && course.status !== 'in_progress') return false;
  
  // If scheduled today or no date (immediate) → show
  if (!scheduledDate || scheduledDate < todayEnd) return true;
  
  return false;
};

const getAcceptedDevis = (course: ActiveCourse) => {
  return [...(course.devis ?? [])]
    .filter((quote) => quote.status === 'accepted')
    .sort((a, b) => {
      const aTime = new Date(a.accepted_at || a.created_at).getTime();
      const bTime = new Date(b.accepted_at || b.created_at).getTime();
      return bTime - aTime;
    })[0] ?? null;
};

const isOperationalCourse = (course: ActiveCourse) => {
  if (course.status === 'in_progress' || course.status === 'accepted') return true;
  return Boolean(getAcceptedDevis(course));
};

const getDriverStatusFromCourse = (course: ActiveCourse): 'assigned' | 'in_ride' | null => {
  if (course.status === 'in_progress') return 'in_ride';
  if (isOperationalCourse(course)) return 'assigned';
  return null;
};

const getCoursePriority = (course: ActiveCourse) => {
  if (course.status === 'in_progress') return 3;
  if (course.status === 'accepted' || getAcceptedDevis(course)) return 2;
  return 1;
};

const pickRelevantCourse = (courses: ActiveCourse[]) => {
  const relevant = courses.filter((course) => isCourseTodayOrImmediate(course) && isOperationalCourse(course));

  return [...relevant].sort((a, b) => {
    const priorityDiff = getCoursePriority(b) - getCoursePriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    const aTime = new Date(a.updated_at || a.created_at).getTime();
    const bTime = new Date(b.updated_at || b.created_at).getTime();
    return bTime - aTime;
  })[0] ?? null;
};

export function ActiveCourseCard({ driverId, onCourseChange, onCourseActive }: ActiveCourseCardProps) {
  const [course, setCourse] = useState<ActiveCourse | null>(null);
  const [phase, setPhase] = useState<CoursePhase>('approaching');
  const [loading, setLoading] = useState(false);
  const [showStopReasons, setShowStopReasons] = useState(false);
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
  const [upcomingReservations, setUpcomingReservations] = useState<ActiveCourse[]>([]);
  const wasAvailableBeforeCourseRef = useRef<boolean | null>(null);
  const [completionData, setCompletionData] = useState<{
    courseId: string;
    clientName: string;
    amount: number;
    paymentMethod: string;
    paymentResult: { success: boolean; status?: string; error?: string; alreadyPaid?: boolean };
  } | null>(null);
  const [rideRequestId, setRideRequestId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [dismissedCourseIds, setDismissedCourseIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('solocab_dismissed_courses');
      if (raw) return new Set(JSON.parse(raw));
    } catch {}
    return new Set();
  });

  const dismissCourse = useCallback((courseId: string) => {
    setDismissedCourseIds(prev => {
      const next = new Set(prev);
      next.add(courseId);
      const arr = [...next];
      const trimmed = arr.slice(-20);
      const result = new Set(trimmed);
      try { localStorage.setItem('solocab_dismissed_courses', JSON.stringify(trimmed)); } catch {}
      return result;
    });
  }, []);

  const fetchActive = useCallback(async () => {
    if (!driverId) return;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const { data, error } = await supabase
      .from('courses')
      .select(`
        id, status, created_at, updated_at, scheduled_date, course_number,
        pickup_address, destination_address,
        pickup_latitude, pickup_longitude,
        destination_latitude, destination_longitude,
        guest_name, guest_phone, guest_estimated_price, final_payment_amount,
        distance_km, payment_method, payment_method_requested, driver_id,
        clients(profiles:user_id(full_name, phone)),
        devis(amount, status, accepted_at, created_at)
      `)
      .eq('driver_id', driverId)
      .in('status', ['pending', 'accepted', 'in_progress'])
      .or(`scheduled_date.is.null,scheduled_date.gte.${todayStart.toISOString()},status.eq.in_progress`)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[ActiveCourseCard] fetch error:', error);
      return;
    }

    const candidates = (data ?? []) as unknown as ActiveCourse[];
    const nonDismissed = candidates.filter(c => !dismissedCourseIds.has(c.id));
    const todayOnly = nonDismissed.filter(isCourseTodayOrImmediate);
    const newCourse = pickRelevantCourse(todayOnly);

    const upcoming = todayOnly
      .filter(c => c.id !== newCourse?.id && c.scheduled_date)
      .sort((a, b) => new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime());
    setUpcomingReservations(upcoming);

    if (newCourse && newCourse.driver_id !== driverId) {
      console.warn('[ActiveCourseCard] driver_id mismatch, ignoring');
      setCourse(null);
      onCourseActive?.(false);
      return;
    }

    const prev = course;
    const prevBusyStatus = prev ? getDriverStatusFromCourse(prev) : null;
    const nextBusyStatus = newCourse ? getDriverStatusFromCourse(newCourse) : null;

    setCourse(newCourse);
    onCourseActive?.(!!newCourse);

    if (newCourse && nextBusyStatus) {
      const isNewAssignment = prev?.id !== newCourse.id;
      const busyStatusChanged = prevBusyStatus !== nextBusyStatus;

      if (isNewAssignment || busyStatusChanged) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('is_available_now, driver_status')
          .eq('id', driverId)
          .maybeSingle();

        if (isNewAssignment && wasAvailableBeforeCourseRef.current === null) {
          wasAvailableBeforeCourseRef.current = driverData?.is_available_now ?? false;
        }

        if (driverData?.driver_status !== nextBusyStatus || driverData?.is_available_now !== false) {
          await supabase.from('drivers').update({
            is_available_now: false,
            driver_status: nextBusyStatus,
          }).eq('id', driverId);
          console.log('[ActiveCourseCard] Driver status synced from course:', nextBusyStatus);
        }
      }
    } else if (!newCourse && prev) {
      await supabase.from('drivers').update({
        is_available_now: true,
        driver_status: 'online',
        last_location_update: new Date().toISOString(),
      }).eq('id', driverId);
      wasAvailableBeforeCourseRef.current = null;
      console.log('[ActiveCourseCard] Driver restored to online with fresh GPS');
      onCourseChange?.();
    }

    if (newCourse) {
      let dbPhase: CoursePhase = 'approaching';
      if (newCourse.status === 'in_progress') dbPhase = 'in_progress';

      const persisted = loadPersistedPhase(newCourse.id);
      const baseline = persisted && PHASE_ORDER[persisted] > PHASE_ORDER[phase]
        ? persisted
        : phase;
      const nextPhase = advancePhase(baseline, dbPhase);

      if (nextPhase !== phase) {
        setPhase(nextPhase);
        persistPhase(newCourse.id, nextPhase);
      }
    }
  }, [driverId, onCourseChange, onCourseActive, course, phase, dismissedCourseIds]);

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
  }, [driverId, fetchActive]);

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

  // Fetch ride_request_id for in-app chat
  useEffect(() => {
    if (!course?.id) {
      setRideRequestId(null);
      return;
    }
    supabase
      .from('ride_requests')
      .select('id')
      .eq('final_course_id', course.id)
      .limit(1)
      .then(({ data }) => {
        setRideRequestId(data?.[0]?.id || null);
      });
  }, [course?.id]);


  const handleArrived = useCallback(async () => {
    const next: CoursePhase = 'arrived';
    setPhase(next);
    if (course) persistPhase(course.id, next);
    toast.success('Vous êtes arrivé au point de prise en charge');
  }, [course]);

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
      if (course) persistPhase(course.id, 'in_progress');
      toast.success('Course démarrée !');
    } catch {
      toast.error("Erreur au démarrage");
    } finally {
      setLoading(false);
    }
  }, [course, driverId]);

  const restoreAvailability = useCallback(async () => {
    wasAvailableBeforeCourseRef.current = null;
    // Always restore to online — driver should stay connected after a course
    // CRITICAL: Also update last_location_update to prevent GPS staleness
    // that would make the driver invisible in find_nearby_drivers
    await supabase.from('drivers').update({ 
      is_available_now: true,
      driver_status: 'online',
      last_location_update: new Date().toISOString(),
    }).eq('id', driverId);
    console.log('[ActiveCourseCard] Driver restored to online with fresh GPS timestamp');
  }, [driverId]);

  const handleComplete = useCallback(async () => {
    if (!course) return;
    setLoading(true);
    
    const currentPaymentMethod = course.payment_method || course.payment_method_requested || 'cash';
    const isCardPayment = currentPaymentMethod === 'card' || currentPaymentMethod === 'stripe' || currentPaymentMethod === 'card_online';
    const courseAmount = course.final_payment_amount ?? course.guest_estimated_price ?? getAcceptedDevis(course)?.amount ?? 0;
    const courseClientName = course.clients?.profiles?.full_name || course.guest_name || 'Client';
    
    let paymentResult = { success: false, status: '', error: '', alreadyPaid: false };
    
    // Mark course as completed in DB FIRST to prevent it from reappearing
    await supabase
      .from('courses')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', course.id)
      .eq('driver_id', driverId);
    
    // Always call finalize-course-payment for ALL payment types (card AND cash)
    // This creates the payment record, calculates fees, and triggers financial sync
    try {
      const { data, error } = await supabase.functions.invoke('finalize-course-payment', {
        body: { course_id: course.id },
      });
      if (error) {
        paymentResult = { success: false, status: 'failed', error: error.message || 'Erreur lors de la finalisation', alreadyPaid: false };
      } else if (data?.status === 'succeeded' || data?.success || data?.already_paid || data?.flow === 'manual') {
        paymentResult = { success: true, status: data?.status || 'succeeded', error: '', alreadyPaid: !!data?.already_paid };
      } else {
        paymentResult = { success: false, status: data?.status || 'failed', error: data?.error || 'La finalisation n\'a pas abouti', alreadyPaid: false };
      }
    } catch (err: any) {
      paymentResult = { success: false, status: 'failed', error: err.message || 'Erreur réseau', alreadyPaid: false };
    }

    // ✅ Restore driver availability IMMEDIATELY after completing the ride
    // This allows the driver to receive new requests while viewing the completion screen
    await restoreAvailability();

    // Show completion screen with all info
    setCompletionData({
      courseId: course.id,
      clientName: courseClientName,
      amount: courseAmount,
      paymentMethod: currentPaymentMethod,
      paymentResult,
    });
    
    setLoading(false);
  }, [course, driverId]);

  const handleStopCourse = useCallback(async (reason: string) => {
    if (!course) return;
    setLoading(true);
    setShowStopReasons(false);
    try {
      const { error } = await supabase.functions.invoke('process-cancellation-fee', {
        body: {
          course_id: course.id,
          cancelled_by: 'driver',
          reason,
        },
      });

      if (error) throw error;

      toast.success(`Course arrêtée: ${reason}`);
      dismissCourse(course.id);
      setCourse(null);
      if (course) clearPersistedPhase(course.id);
      restoreAvailability();
      onCourseChange?.();
    } catch {
      toast.error("Impossible d'arrêter correctement la course");
    } finally {
      setLoading(false);
    }
  }, [course, driverId, onCourseChange, restoreAvailability]);

  const acceptedDevis = course ? getAcceptedDevis(course) : null;
  const clientName = course?.clients?.profiles?.full_name || course?.guest_name || 'Client';
  const clientPhone = course?.clients?.profiles?.phone || course?.guest_phone;
  const clientPhoneHref = clientPhone?.replace(/\s+/g, '');
  const price = course?.final_payment_amount ?? course?.guest_estimated_price ?? acceptedDevis?.amount ?? null;
  const paymentMethod = course?.payment_method || course?.payment_method_requested;
  const paymentLabel = paymentMethod === 'stripe' || paymentMethod === 'card'
    ? '💳 Paiement carte' : '💵 Paiement espèces';

  const handleDismissCompletion = useCallback(() => {
    if (completionData) {
      dismissCourse(completionData.courseId);
      clearPersistedPhase(completionData.courseId);
    }
    setCompletionData(null);
    setCourse(null);
    restoreAvailability();
    onCourseChange?.();
  }, [completionData, restoreAvailability, onCourseChange]);

  // Show completion screen if available
  if (completionData) {
    return (
      <CourseCompletionScreen
        courseId={completionData.courseId}
        clientName={completionData.clientName}
        amount={completionData.amount}
        paymentMethod={completionData.paymentMethod}
        paymentResult={completionData.paymentResult}
        onDismiss={handleDismissCompletion}
      />
    );
  }

  // If no active course, show upcoming reservations banner only
  if (!course) {
    if (upcomingReservations.length === 0) return null;
    return (
      <div className="fixed bottom-20 inset-x-0 z-[100] px-4">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <CalendarClock className="w-4 h-4" />
            Réservations du jour
          </div>
          {upcomingReservations.slice(0, 3).map(res => {
            const resDevis = getAcceptedDevis(res);
            const resTime = res.scheduled_date ? format(new Date(res.scheduled_date), 'HH:mm', { locale: fr }) : '—';
            const resClient = res.clients?.profiles?.full_name || res.guest_name || 'Client';
            return (
              <div key={res.id} className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-2">
                <div className="text-lg font-black text-primary min-w-[50px]">{resTime}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{res.destination_address}</p>
                  <p className="text-xs text-muted-foreground">{resClient} • {resDevis?.amount ? `${resDevis.amount}€` : '—'}</p>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground text-center">
            Pensez à ne pas prendre de course immédiate avant vos réservations
          </p>
        </div>
      </div>
    );
  }

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
              {clientPhoneHref && (
                <div className="flex items-center gap-2">
                  <a
                    href={`sms:${clientPhoneHref}`}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
                    aria-label="Écrire au client"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                  <a
                    href={`tel:${clientPhoneHref}`}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
                    aria-label="Appeler le client"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                </div>
              )}
            </div>
            {course?.course_number && (
              <div className="mt-3 rounded-xl bg-background/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                Course {course.course_number}
              </div>
            )}
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
