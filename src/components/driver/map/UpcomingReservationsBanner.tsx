import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, MapPin, Clock, AlertTriangle, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Reservation {
  id: string;
  scheduled_date: string;
  pickup_address: string;
  destination_address: string;
  guest_name: string | null;
  status: string;
  clients: { profiles: { full_name: string } | null } | null;
  devis: { amount: number; status: string }[];
}

interface UpcomingReservationsBannerProps {
  driverId: string;
  hasActiveCourse: boolean;
}

export function UpcomingReservationsBanner({ driverId, hasActiveCourse }: UpcomingReservationsBannerProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [alertShown, setAlertShown] = useState<Set<string>>(new Set());
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchReservations = useCallback(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const { data } = await supabase
      .from('courses')
      .select(`
        id, scheduled_date, pickup_address, destination_address,
        guest_name, status,
        clients(profiles:user_id(full_name)),
        devis(amount, status)
      `)
      .eq('driver_id', driverId)
      .in('status', ['pending', 'accepted'])
      .not('scheduled_date', 'is', null)
      .gte('scheduled_date', todayStart.toISOString())
      .lt('scheduled_date', todayEnd.toISOString())
      .order('scheduled_date', { ascending: true })
      .limit(20);

    if (data) {
      setReservations(data as unknown as Reservation[]);
    }
  }, [driverId]);

  useEffect(() => {
    fetchReservations();
    const interval = setInterval(fetchReservations, 30000);

    // Realtime: refresh immediately when any course status changes
    const channel = supabase
      .channel('banner-course-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'courses',
          filter: `driver_id=eq.${driverId}`,
        },
        () => {
          fetchReservations();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchReservations, driverId]);

  // Auto-scroll when multiple reservations
  useEffect(() => {
    if (reservations.length <= 1) return;
    autoScrollRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % reservations.length);
    }, 5000);
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [reservations.length]);

  // Proximity alert check (every 30s)
  useEffect(() => {
    const checkAlerts = () => {
      const now = new Date();
      reservations.forEach(res => {
        if (!res.scheduled_date || alertShown.has(res.id)) return;
        const diff = differenceInMinutes(new Date(res.scheduled_date), now);
        if (diff <= 60 && diff > 0) {
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const clientName = res.clients?.profiles?.full_name || res.guest_name || 'Client';
            new Notification('🚗 Réservation imminente', {
              body: `${clientName} dans ${diff} min — ${res.pickup_address?.slice(0, 50)}`,
              icon: '/favicon.ico',
              tag: `reservation-alert-${res.id}`,
            });
          }
          setAlertShown(prev => new Set(prev).add(res.id));
        }
      });
    };
    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [reservations, alertShown]);

  if (reservations.length === 0) return null;

  const getClientName = (res: Reservation) =>
    res.clients?.profiles?.full_name || res.guest_name || 'Client';

  const getAmount = (res: Reservation) => {
    const accepted = res.devis?.find(d => d.status === 'accepted');
    return accepted?.amount || res.devis?.[0]?.amount || 0;
  };

  const getTimeUntil = (date: string) => {
    const diff = differenceInMinutes(new Date(date), new Date());
    if (diff <= 0) return 'Maintenant';
    if (diff < 60) return `${diff} min`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
  };

  const isUrgent = (date: string) => {
    const diff = differenceInMinutes(new Date(date), new Date());
    return diff <= 60 && diff > 0;
  };

  const isVeryUrgent = (date: string) => {
    const diff = differenceInMinutes(new Date(date), new Date());
    return diff <= 30 && diff > 0;
  };

  const current = reservations[currentIndex] || reservations[0];
  if (!current) return null;

  const urgent = isUrgent(current.scheduled_date);
  const veryUrgent = isVeryUrgent(current.scheduled_date);

  const goNext = () => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    setCurrentIndex(prev => (prev + 1) % reservations.length);
  };

  const goPrev = () => {
    if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    setCurrentIndex(prev => (prev - 1 + reservations.length) % reservations.length);
  };

  // Position: if there's an active course, show at top below header. Otherwise show above bottom bar.
  const positionClass = hasActiveCourse
    ? 'fixed top-[120px] inset-x-0 z-[9995]'
    : 'fixed bottom-[100px] inset-x-0 z-[9995]';

  return (
    <div className={positionClass}>
      <div className="px-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className={`rounded-2xl border shadow-2xl backdrop-blur-xl overflow-hidden ${
              veryUrgent
                ? 'bg-destructive/95 border-destructive/50'
                : urgent
                  ? 'bg-amber-500/95 border-amber-400/50'
                  : 'bg-card/95 border-border/50'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-3 py-1.5 ${
              veryUrgent ? 'bg-white/10' : urgent ? 'bg-white/10' : 'bg-primary/5'
            }`}>
              <div className="flex items-center gap-1.5">
                <CalendarClock className={`w-3.5 h-3.5 ${veryUrgent || urgent ? 'text-white' : 'text-primary'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  veryUrgent || urgent ? 'text-white' : 'text-primary'
                }`}>
                  {reservations.length > 1
                    ? `Réservation ${currentIndex + 1}/${reservations.length}`
                    : 'Prochaine réservation'
                  }
                </span>
              </div>
              {urgent && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-white animate-pulse" />
                  <span className="text-[10px] font-bold text-white">
                    {veryUrgent ? 'IMMINENT' : 'BIENTÔT'}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                {/* Left: time + client */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Time badge */}
                  <div className={`flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 min-w-[56px] ${
                    veryUrgent
                      ? 'bg-white/20'
                      : urgent
                        ? 'bg-white/20'
                        : 'bg-primary/10'
                  }`}>
                    <span className={`text-lg font-black leading-none ${
                      veryUrgent || urgent ? 'text-white' : 'text-primary'
                    }`}>
                      {format(new Date(current.scheduled_date), 'HH:mm')}
                    </span>
                    <span className={`text-[9px] font-bold mt-0.5 ${
                      veryUrgent || urgent ? 'text-white/80' : 'text-primary/70'
                    }`}>
                      {getTimeUntil(current.scheduled_date)}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <User className={`w-3 h-3 shrink-0 ${veryUrgent || urgent ? 'text-white/80' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-bold truncate ${
                        veryUrgent || urgent ? 'text-white' : 'text-foreground'
                      }`}>
                        {getClientName(current)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className={`w-3 h-3 shrink-0 ${
                        veryUrgent || urgent ? 'text-white/60' : 'text-emerald-500'
                      }`} />
                      <span className={`text-[11px] truncate ${
                        veryUrgent || urgent ? 'text-white/80' : 'text-muted-foreground'
                      }`}>
                        {current.pickup_address?.slice(0, 40)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: amount */}
                <div className="text-right shrink-0">
                  <span className={`text-base font-black ${
                    veryUrgent || urgent ? 'text-white' : 'text-foreground'
                  }`}>
                    {getAmount(current).toFixed(0)}€
                  </span>
                </div>
              </div>

              {/* Urgent message */}
              {urgent && (
                <div className="mt-2 bg-white/15 rounded-lg px-2.5 py-1.5">
                  <p className="text-[10px] text-white font-medium leading-tight">
                    {veryUrgent
                      ? '⚠️ Pensez à vous rapprocher de votre client pour cette réservation !'
                      : '📍 Réservation dans moins d\'1h — anticipez votre positionnement.'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Navigation dots + arrows */}
            {reservations.length > 1 && (
              <div className={`flex items-center justify-center gap-3 py-1.5 ${
                veryUrgent ? 'bg-white/5' : urgent ? 'bg-white/5' : 'bg-muted/30'
              }`}>
                <button onClick={goPrev} className="p-0.5 rounded-full hover:bg-white/10 transition-colors">
                  <ChevronLeft className={`w-4 h-4 ${veryUrgent || urgent ? 'text-white/70' : 'text-muted-foreground'}`} />
                </button>
                <div className="flex gap-1.5">
                  {reservations.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (autoScrollRef.current) clearInterval(autoScrollRef.current);
                        setCurrentIndex(i);
                      }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === currentIndex
                          ? (veryUrgent || urgent ? 'bg-white w-3' : 'bg-primary w-3')
                          : (veryUrgent || urgent ? 'bg-white/40' : 'bg-muted-foreground/30')
                      }`}
                    />
                  ))}
                </div>
                <button onClick={goNext} className="p-0.5 rounded-full hover:bg-white/10 transition-colors">
                  <ChevronRight className={`w-4 h-4 ${veryUrgent || urgent ? 'text-white/70' : 'text-muted-foreground'}`} />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
