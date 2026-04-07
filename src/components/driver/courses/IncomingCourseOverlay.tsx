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
  Zap,
  Shield,
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

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateApproachMinutes(distanceKm: number): number {
  if (distanceKm < 2) return Math.max(3, Math.round((distanceKm / 20) * 60));
  if (distanceKm < 5) return Math.round((distanceKm / 30) * 60);
  if (distanceKm < 20) return Math.round((distanceKm / 40) * 60);
  return Math.round((distanceKm / 60) * 60);
}

function estimateTripMinutes(distanceKm: number): number {
  if (distanceKm < 5) return Math.round((distanceKm / 25) * 60);
  if (distanceKm < 20) return Math.round((distanceKm / 35) * 60);
  return Math.round((distanceKm / 50) * 60);
}

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

// SoloCab brand theme per request type
function getTheme(isExclusive: boolean, isMulti: boolean) {
  if (isExclusive) {
    return {
      // Gold/amber exclusive — premium feel
      bg: 'bg-gradient-to-b from-[#1a1228] via-[#16102a] to-[#0d0a15]',
      accent: '#c084fc', // violet
      accentLight: 'rgba(192,132,252,0.15)',
      accentBorder: 'rgba(192,132,252,0.3)',
      timerColor: (t: number) => t > 40 ? '#c084fc' : t > 15 ? '#f59e0b' : '#ef4444',
      badge: {
        bg: 'bg-violet-500/20',
        border: 'border-violet-400/40',
        text: 'text-violet-300',
        icon: 'text-violet-400',
        label: 'Course exclusive',
        sublabel: 'Vous êtes le seul chauffeur contacté',
        Icon: Crown,
      },
      progressBg: 'rgba(192,132,252,0.15)',
      cardBg: 'bg-white/[0.04]',
      cardBorder: 'border-violet-500/15',
      acceptGlow: 'rgba(139,92,246,0.5)',
      acceptBg: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500',
    };
  }
  if (isMulti) {
    return {
      // Orange/energy multi — urgency feel
      bg: 'bg-gradient-to-b from-[#1a1510] via-[#171210] to-[#0d0a08]',
      accent: '#f97316', // orange
      accentLight: 'rgba(249,115,22,0.15)',
      accentBorder: 'rgba(249,115,22,0.3)',
      timerColor: (t: number) => t > 30 ? '#f97316' : t > 15 ? '#ef4444' : '#dc2626',
      badge: {
        bg: 'bg-orange-500/20',
        border: 'border-orange-400/40',
        text: 'text-orange-300',
        icon: 'text-orange-400',
        label: 'Multi-chauffeurs',
        sublabel: 'Plusieurs chauffeurs contactés — soyez rapide !',
        Icon: Users,
      },
      progressBg: 'rgba(249,115,22,0.15)',
      cardBg: 'bg-white/[0.04]',
      cardBorder: 'border-orange-500/15',
      acceptGlow: 'rgba(249,115,22,0.5)',
      acceptBg: 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500',
    };
  }
  // Default — SoloCab blue
  return {
    bg: 'bg-gradient-to-b from-[#0f1628] via-[#0c1220] to-[#080d18]',
    accent: '#3b82f6',
    accentLight: 'rgba(59,130,246,0.15)',
    accentBorder: 'rgba(59,130,246,0.3)',
    timerColor: (t: number) => t > 40 ? '#22c55e' : t > 15 ? '#f59e0b' : '#ef4444',
    badge: {
      bg: 'bg-blue-500/20',
      border: 'border-blue-400/40',
      text: 'text-blue-300',
      icon: 'text-blue-400',
      label: 'Nouvelle course',
      sublabel: '',
      Icon: Car,
    },
    progressBg: 'rgba(59,130,246,0.15)',
    cardBg: 'bg-white/[0.04]',
    cardBorder: 'border-blue-500/15',
    acceptGlow: 'rgba(34,197,94,0.5)',
    acceptBg: 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500',
  };
}

export function IncomingCourseOverlay({
  course,
  onDismiss,
  onAccepted,
  driverId,
}: IncomingCourseOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_SECONDS);
  const [accepting, setAccepting] = useState(false);
  const [takenByOther, setTakenByOther] = useState(false);
  const audioRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [approachInfo, setApproachInfo] = useState<{ distanceKm: number; minutes: number } | null>(null);

  // Poll ride_request status to auto-dismiss if taken by another driver
  useEffect(() => {
    if (!course || course.source !== 'ride_request') return;
    const rideRequestId = course.sourceId;
    
    const checkStatus = async () => {
      try {
        const { data } = await supabase
          .from('ride_requests')
          .select('status')
          .eq('id', rideRequestId)
          .maybeSingle();
        
        if (data && data.status !== 'pending') {
          console.log('[IncomingCourseOverlay] Ride request no longer pending:', data.status);
          setTakenByOther(true);
          if (audioRef.current) clearInterval(audioRef.current);
          if (navigator.vibrate) navigator.vibrate(0);
          
          // Show message briefly then dismiss
          setTimeout(() => {
            if (driverId) {
              supabase.from('drivers').update({ driver_status: 'online_available', is_available_now: true }).eq('id', driverId);
            }
            onDismiss();
          }, 2500);
        }
      } catch (err) {
        console.error('[IncomingCourseOverlay] Status poll error:', err);
      }
    };

    // Check every 2 seconds
    const pollInterval = setInterval(checkStatus, 2000);
    // Also check immediately after 1s
    const initialCheck = setTimeout(checkStatus, 1000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(initialCheck);
    };
  }, [course?.id, course?.source, course?.sourceId, driverId, onDismiss]);

  useEffect(() => {
    if (!course || !driverId || !course.pickupLatitude || !course.pickupLongitude) {
      setApproachInfo(null);
      return;
    }
    supabase
      .from('drivers')
      .select('current_latitude, current_longitude')
      .eq('id', driverId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.current_latitude && data?.current_longitude && course.pickupLatitude && course.pickupLongitude) {
          const dist = haversineKm(data.current_latitude, data.current_longitude, course.pickupLatitude, course.pickupLongitude);
          setApproachInfo({ distanceKm: Math.round(dist * 10) / 10, minutes: estimateApproachMinutes(dist) });
        }
      });
  }, [course?.id, driverId]);

  useEffect(() => {
    if (!course || !driverId) { setTimeLeft(TIMEOUT_SECONDS); return; }
    setTimeLeft(TIMEOUT_SECONDS);
    setTakenByOther(false);
    supabase.from('drivers').update({ driver_status: 'accepting', is_available_now: false }).eq('id', driverId).then(() => {
      console.log('[IncomingCourseOverlay] Driver set to accepting');
    });
    const interval = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { clearInterval(interval); onDismiss(); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [course?.id, onDismiss]);

  useEffect(() => {
    if (!course) return;
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
    playSoloCabSound(1.0).catch(() => {});
    const soundInterval = setInterval(() => {
      playSoloCabSound(1.0).catch(() => {});
      if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
    }, 4000);
    audioRef.current = soundInterval;
    return () => { clearInterval(soundInterval); if (navigator.vibrate) navigator.vibrate(0); };
  }, [course?.id]);

  const handleAccept = useCallback(async () => {
    if (!course || !driverId || accepting) return;
    setAccepting(true);
    if (audioRef.current) clearInterval(audioRef.current);
    if (navigator.vibrate) navigator.vibrate(0);

    try {
      if (course.source === 'queue') {
        await supabase.from('course_queue').update({ status: 'forced', resolved_at: new Date().toISOString(), resolved_action: 'forced_via_overlay', updated_at: new Date().toISOString() }).eq('id', course.sourceId);
        toast.success('Course acceptée !');
      } else if (course.source === 'shared') {
        await supabase.from('shared_courses').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', course.sourceId);
        toast.success('Course partagée acceptée !');
      } else if (course.source === 'direct') {
        await supabase.from('courses').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', course.sourceId);
        try {
          const { data: courseData } = await supabase.from('courses').select('payment_method_requested, client_id').eq('id', course.sourceId).maybeSingle();
          if (courseData?.payment_method_requested === 'card' && courseData?.client_id) {
            supabase.functions.invoke('create-card-hold', { body: { driver_id: driverId, course_id: course.sourceId, client_id: courseData.client_id } }).catch(err => console.error('Auto card hold failed:', err));
          }
        } catch (holdErr) { console.error('Card hold check failed:', holdErr); }
        toast.success('Course acceptée !');
      } else if (course.source === 'ride_request') {
        const { data, error } = await supabase.functions.invoke('accept-ride-request', { body: { ride_request_id: course.sourceId } });
        if (error) throw error;
        if (!data?.success) {
          if (data?.already_taken) toast.error('Cette course a déjà été prise par un autre chauffeur');
          else if (data?.expired) toast.error('Cette demande a expiré');
          else toast.error(data?.error || "Erreur lors de l'acceptation");
          await supabase.from('drivers').update({ driver_status: 'online_available', is_available_now: true }).eq('id', driverId);
          onDismiss();
          return;
        }
        toast.success('Course acceptée !');
      }
      await supabase.from('drivers').update({ driver_status: 'on_trip', is_available_now: false }).eq('id', driverId);
      onAccepted();
    } catch (err: any) {
      console.error('Error accepting course:', err);
      toast.error(err.message || "Erreur lors de l'acceptation");
      if (driverId) await supabase.from('drivers').update({ driver_status: 'online_available', is_available_now: true }).eq('id', driverId);
    } finally {
      setAccepting(false);
    }
  }, [course, driverId, accepting, onAccepted, onDismiss]);

  const handleDismiss = useCallback(async () => {
    if (audioRef.current) clearInterval(audioRef.current);
    if (navigator.vibrate) navigator.vibrate(0);
    if (driverId) await supabase.from('drivers').update({ driver_status: 'online_available', is_available_now: true }).eq('id', driverId);
    if (course?.source === 'ride_request' && course.sourceId) {
      try { await supabase.from('ride_requests').update({ status: 'rejected' }).eq('id', course.sourceId); } catch (err) { console.error('Error rejecting ride request:', err); }
    }
    onDismiss();
  }, [course, driverId, onDismiss]);

  const isExclusive = course?.requestType === 'exclusive';
  const isMulti = course?.requestType === 'multi';
  const theme = getTheme(isExclusive, isMulti);

  const progressPercent = (timeLeft / TIMEOUT_SECONDS) * 100;
  const timerColor = theme.timerColor(timeLeft);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference * (1 - timeLeft / TIMEOUT_SECONDS);

  const tripMinutes = course?.distanceKm ? estimateTripMinutes(course.distanceKm) : null;
  const paymentInfo = course ? getPaymentLabel(course.paymentMethod) : null;
  const PaymentIcon = paymentInfo?.icon || CreditCard;
  const BadgeIcon = theme.badge.Icon;

  return (
    <AnimatePresence>
      {course && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed inset-0 z-[999999] flex flex-col text-white overflow-auto ${theme.bg}`}
          style={{ touchAction: 'none' }}
        >
          {/* Top progress bar */}
          <div className="w-full h-1.5" style={{ background: theme.progressBg }}>
            <motion.div
              className="h-full rounded-r-full"
              style={{ background: timerColor }}
              initial={{ width: '100%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>

          <div className="flex-1 flex flex-col items-center px-4 py-3 max-w-md mx-auto w-full overflow-y-auto">

            {/* BADGE TYPE — Major visual distinction */}
            <motion.div
              className="w-full mb-3"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05, type: 'spring', stiffness: 400, damping: 25 }}
            >
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${theme.badge.bg} ${theme.badge.border}`}>
                <div className={`p-2 rounded-xl ${theme.badge.bg}`}>
                  <BadgeIcon className={`h-6 w-6 ${theme.badge.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className={`text-base font-black ${theme.badge.text}`}>{theme.badge.label}</h1>
                  {theme.badge.sublabel && (
                    <p className="text-[10px] text-white/50 mt-0.5">{theme.badge.sublabel}</p>
                  )}
                </div>
                {isMulti && (
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    <Zap className="h-5 w-5 text-orange-400" />
                  </motion.div>
                )}
                {isExclusive && (
                  <Shield className="h-5 w-5 text-violet-400" />
                )}
              </div>
              {course.rideId && (
                <p className="text-[8px] text-white/20 font-mono text-center mt-1">
                  REF: {course.rideId.slice(0, 8)}
                </p>
              )}
            </motion.div>

            {/* TIMER */}
            <motion.div
              className="mb-3"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
                  <motion.circle
                    cx="60" cy="60" r="54"
                    fill="none"
                    stroke={timerColor}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1, ease: 'linear' }}
                    style={{ filter: `drop-shadow(0 0 10px ${timerColor})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black tabular-nums" style={{ color: timerColor }}>
                    {timeLeft}
                  </span>
                  <span className="text-[8px] text-white/40 uppercase tracking-widest">sec</span>
                </div>
              </div>
              {/* Urgency hint for multi */}
              {isMulti && timeLeft <= 30 && (
                <motion.p
                  className="text-[10px] text-orange-400 font-bold text-center mt-1"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  ⚡ Décidez vite !
                </motion.p>
              )}
            </motion.div>

            {/* APPROACH + TRIP side by side */}
            {(approachInfo || tripMinutes != null) && (
              <motion.div
                className="w-full flex gap-2 mb-2.5"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                {approachInfo && (
                  <div className={`flex-1 rounded-xl p-2.5 text-center border ${theme.cardBg} ${theme.cardBorder}`}
                    style={{ borderColor: theme.accentBorder }}
                  >
                    <Car className="h-4 w-4 mx-auto mb-1" style={{ color: theme.accent }} />
                    <p className="text-[8px] uppercase tracking-wider font-semibold" style={{ color: `${theme.accent}99` }}>Approche</p>
                    <p className="text-sm font-black" style={{ color: theme.accent }}>{approachInfo.distanceKm} km</p>
                    <p className="text-[10px] font-bold text-white/40">~{approachInfo.minutes} min</p>
                  </div>
                )}
                {tripMinutes != null && (
                  <div className={`flex-1 rounded-xl p-2.5 text-center border ${theme.cardBg}`}
                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    <Clock className="h-4 w-4 text-white/50 mx-auto mb-1" />
                    <p className="text-[8px] uppercase tracking-wider font-semibold text-white/40">Trajet</p>
                    <p className="text-sm font-black text-white/80">~{tripMinutes} min</p>
                    {course.distanceKm != null && (
                      <p className="text-[10px] font-bold text-white/30">{course.distanceKm.toFixed(1)} km</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ROUTE */}
            <motion.div
              className={`w-full rounded-2xl p-3 mb-2.5 border ${theme.cardBg} ${theme.cardBorder}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                  <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500/80 to-violet-500/80 my-0.5" />
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-lg shadow-violet-500/50" />
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div>
                    <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Départ</p>
                    <p className="text-[11px] font-semibold leading-tight text-white/90">{course.pickupAddress}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-violet-400 uppercase tracking-widest mb-0.5">Destination</p>
                    <p className="text-[11px] font-semibold leading-tight text-white/90">{course.destinationAddress}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* DETAILS GRID */}
            <motion.div
              className="w-full grid grid-cols-2 gap-2 mb-2.5"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              {/* Prix */}
              {course.amount != null && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2.5 text-center">
                  <Euro className="h-4 w-4 text-emerald-400 mx-auto mb-0.5" />
                  <p className="text-[8px] text-emerald-300/60 uppercase tracking-wider font-semibold">Prix</p>
                  <p className="text-xl font-black text-emerald-400">{course.amount.toFixed(2)}€</p>
                </div>
              )}

              {/* Paiement */}
              {paymentInfo && course.paymentMethod && (
                <div className={`rounded-xl p-2.5 text-center border ${
                  course.paymentMethod === 'card'
                    ? 'bg-violet-500/10 border-violet-500/25'
                    : 'bg-amber-500/10 border-amber-500/25'
                }`}>
                  <PaymentIcon className={`h-4 w-4 mx-auto mb-0.5 ${
                    course.paymentMethod === 'card' ? 'text-violet-400' : 'text-amber-400'
                  }`} />
                  <p className={`text-[8px] uppercase tracking-wider font-semibold ${
                    course.paymentMethod === 'card' ? 'text-violet-300/60' : 'text-amber-300/60'
                  }`}>Paiement</p>
                  <p className={`text-sm font-bold ${
                    course.paymentMethod === 'card' ? 'text-violet-400' : 'text-amber-400'
                  }`}>{paymentInfo.label}</p>
                </div>
              )}

              {/* Date */}
              {course.scheduledDate && (
                <div className={`rounded-xl p-2.5 text-center border ${theme.cardBg} border-white/[0.06]`}>
                  <Calendar className="h-4 w-4 text-white/50 mx-auto mb-0.5" />
                  <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold">Date</p>
                  <p className="text-sm font-bold text-white/80">
                    {format(new Date(course.scheduledDate), "d MMM HH:mm", { locale: fr })}
                  </p>
                </div>
              )}

              {/* Client */}
              {course.clientName && (
                <div className={`rounded-xl p-2.5 text-center border ${theme.cardBg} border-white/[0.06]`}>
                  <User className="h-4 w-4 text-white/50 mx-auto mb-0.5" />
                  <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold">Client</p>
                  <p className="text-sm font-bold text-white/80 truncate">
                    {(() => {
                      const parts = course.clientName!.trim().split(/\s+/);
                      if (parts.length > 1) return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
                      return parts[0];
                    })()}
                  </p>
                </div>
              )}
            </motion.div>

            {course.senderDriverName && (
              <div className="flex items-center gap-2 text-[11px] text-white/40 mb-2">
                <Handshake className="h-3.5 w-3.5" />
                <span>Partagée par {course.senderDriverName}</span>
              </div>
            )}

            <div className="flex-1 min-h-2" />

            {/* ACTION BUTTONS */}
            <motion.div
              className="w-full space-y-2"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                animate={{ boxShadow: [`0 0 20px ${theme.acceptGlow}`, `0 0 40px ${theme.acceptGlow}`, `0 0 20px ${theme.acceptGlow}`] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="rounded-2xl"
              >
                <Button
                  className={`w-full h-14 text-lg font-black rounded-2xl text-white shadow-2xl active:scale-[0.97] transition-transform ${theme.acceptBg}`}
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
                className="w-full h-11 text-sm font-bold rounded-2xl text-white/40 hover:text-white/60 hover:bg-white/5 border border-white/10 active:scale-[0.97] transition-transform"
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
