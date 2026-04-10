import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, X, CheckCircle2, XCircle, Clock, Crown, Users, Car, Search,
  MapPin, RefreshCw, CalendarClock, User, Phone, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { NearbyDriver } from '@/hooks/useNearbyDrivers';
import { DriverResultCard } from '@/components/client/booking/DriverResultCard';

export type WaitingStatus = 'searching' | 'transition' | 'relaunching' | 'extended_searching' | 'accepted' | 'rejected' | 'expired' | 'no_drivers' | 'cancelled';

type SearchPhase = 'selected' | 'relaunch' | 'nearby' | 'extended';

interface RideWaitingScreenProps {
  requestId: string;
  requestGroupId?: string;
  requestType: 'exclusive' | 'multi';
  driverCount: number;
  pickupAddress: string;
  destinationAddress: string;
  estimatedPrice: number;
  driverName?: string;
  timeoutAt: string;
  onCancel: () => void;
  onAccepted: (driverName: string, courseId?: string) => void;
  onExpired: () => void;
  /** Driver data for animated card carousel during wait */
  contactedDriversData?: NearbyDriver[];
  routeDistanceKm?: number;
  clientPaymentMethod?: 'card' | 'cash' | null;
}

const PHASE_CONFIG: Record<SearchPhase, { timeout: number; nextRadius: number; nextPhase: SearchPhase | null; relaunchFirst?: boolean }> = {
  selected: { timeout: 60, nextRadius: 5, nextPhase: 'relaunch', relaunchFirst: true },
  relaunch: { timeout: 30, nextRadius: 5, nextPhase: 'nearby' },
  nearby: { timeout: 60, nextRadius: 10, nextPhase: 'extended' },
  extended: { timeout: 60, nextRadius: 20, nextPhase: null },
};

const PHASE_MESSAGES: Record<SearchPhase, { title: string; subtitle: string; icon: React.ReactNode }> = {
  selected: {
    title: 'Recherche de votre chauffeur…',
    subtitle: '',
    icon: <Car className="h-10 w-10 text-primary" />,
  },
  relaunch: {
    title: 'Relance en cours…',
    subtitle: 'Certains chauffeurs n\'ont pas répondu. Nous les recontactons.',
    icon: <RefreshCw className="h-10 w-10 text-primary" />,
  },
  nearby: {
    title: 'Recherche élargie en cours…',
    subtitle: 'Nous contactons des chauffeurs à proximité de votre point de départ.',
    icon: <Search className="h-10 w-10 text-primary" />,
  },
  extended: {
    title: 'Extension de la recherche…',
    subtitle: 'Zone de recherche étendue pour maximiser vos chances.',
    icon: <MapPin className="h-10 w-10 text-primary" />,
  },
};

export function RideWaitingScreen({
  requestId,
  requestGroupId,
  requestType,
  driverCount,
  pickupAddress,
  destinationAddress,
  estimatedPrice,
  driverName,
  timeoutAt,
  onCancel,
  onAccepted,
  onExpired,
  contactedDriversData,
  routeDistanceKm,
  clientPaymentMethod,
}: RideWaitingScreenProps) {
  const [status, setStatus] = useState<WaitingStatus>('searching');
  const [phase, setPhase] = useState<SearchPhase>('selected');
  const [timeLeft, setTimeLeft] = useState(60);
  const [acceptedDriverName, setAcceptedDriverName] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [extendedDriverCount, setExtendedDriverCount] = useState(0);
  const [currentTimeoutAt, setCurrentTimeoutAt] = useState(timeoutAt);
  const phaseRef = useRef(phase);
  const isExtendingRef = useRef(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [autoScrollIndex, setAutoScrollIndex] = useState(0);

  // Auto-scroll carousel of driver cards during search
  useEffect(() => {
    if (!contactedDriversData || contactedDriversData.length <= 1) return;
    if (status !== 'searching' && status !== 'extended_searching' && status !== 'relaunching' && status !== 'transition') return;
    
    const interval = setInterval(() => {
      setAutoScrollIndex(prev => {
        const next = (prev + 1) % contactedDriversData.length;
        if (carouselRef.current) {
          const cardWidth = 180; // approximate card width + gap
          carouselRef.current.scrollTo({ left: next * cardWidth, behavior: 'smooth' });
        }
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [contactedDriversData, status]);

  // Contacted drivers list for UI
  interface ContactedDriver {
    driver_id: string;
    driver_name: string;
    photo_url: string | null;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
  }
  const [contactedDrivers, setContactedDrivers] = useState<ContactedDriver[]>([]);

  // Poll contacted drivers statuses
  useEffect(() => {
    const groupId = requestGroupId || requestId;
    const fetchDrivers = async () => {
      const { data } = await supabase
        .from('ride_requests')
        .select('selected_driver_id, status, drivers:selected_driver_id(display_name, company_name, profile_photo_url)')
        .eq('request_group_id', groupId);
      if (data) {
        setContactedDrivers(data.map((r: any) => ({
          driver_id: r.selected_driver_id,
          driver_name: r.drivers?.display_name || r.drivers?.company_name || 'Chauffeur',
          photo_url: r.drivers?.profile_photo_url || null,
          status: r.status as ContactedDriver['status'],
        })));
      }
    };
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 3000);
    return () => clearInterval(interval);
  }, [requestId, requestGroupId, phase]);

  phaseRef.current = phase;

  // Update subtitle for selected phase based on request type
  const getPhaseMessage = useCallback(() => {
    const msg = { ...PHASE_MESSAGES[phase] };
    if (phase === 'selected') {
      msg.subtitle = requestType === 'exclusive'
        ? `${driverName || 'Le chauffeur'} a été contacté. En attente de sa réponse…`
        : `${driverCount} chauffeurs sont contactés. Le premier à accepter prendra votre course.`;
    }
    return msg;
  }, [phase, requestType, driverName, driverCount]);

  // Timer countdown
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const timeout = new Date(currentTimeoutAt).getTime();
      const remaining = Math.max(0, Math.ceil((timeout - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0 && (status === 'searching' || status === 'extended_searching')) {
        handlePhaseTimeout();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentTimeoutAt, status]);

  // Phase timeout handler - triggers next phase or final expiry
  const handlePhaseTimeout = useCallback(async () => {
    if (isExtendingRef.current) return;
    isExtendingRef.current = true;

    const currentPhase = phaseRef.current;
    const config = PHASE_CONFIG[currentPhase];

    if (config.nextPhase) {
      // Transition to next phase
      setStatus('transition');

      // Wait 2 seconds showing transition message
      setTimeout(async () => {
        try {
          // RELAUNCH PHASE: relaunch non-responders only (not rejected)
          if (config.relaunchFirst) {
            const { data: relaunchData, error: relaunchErr } = await supabase.functions.invoke('extended-driver-search', {
              body: {
                request_group_id: requestGroupId || requestId,
                relaunch_non_responders: true,
              },
            });

            if (relaunchErr) throw relaunchErr;

            if (relaunchData?.already_accepted) {
              isExtendingRef.current = false;
              return;
            }

            if (relaunchData?.new_requests > 0) {
              // Some non-responders were relaunched → go to relaunch phase
              setPhase('relaunch');
              setExtendedDriverCount(relaunchData.drivers_relaunched || 0);
              setCurrentTimeoutAt(relaunchData.timeout_at || new Date(Date.now() + 30000).toISOString());
              setStatus('relaunching');
              isExtendingRef.current = false;
              return;
            }

            // No one to relaunch (all rejected) → skip to nearby search
          }

          // STANDARD EXTENDED SEARCH: find new drivers at wider radius
          const { data, error } = await supabase.functions.invoke('extended-driver-search', {
            body: {
              request_group_id: requestGroupId || requestId,
              radius_km: config.nextRadius,
              search_phase: config.nextPhase === 'relaunch' ? 'nearby' : config.nextPhase,
            },
          });

          if (error) throw error;

          if (data?.already_accepted) {
            isExtendingRef.current = false;
            return;
          }

          const targetPhase = config.nextPhase === 'relaunch' ? 'nearby' : config.nextPhase;

          if (data?.no_drivers || data?.new_requests === 0) {
            // No drivers found at this radius, try next phase
            const nextConfig = PHASE_CONFIG[targetPhase!];
            if (nextConfig?.nextPhase) {
              setPhase(targetPhase!);
              const { data: data2 } = await supabase.functions.invoke('extended-driver-search', {
                body: {
                  request_group_id: requestGroupId || requestId,
                  radius_km: nextConfig.nextRadius,
                  search_phase: nextConfig.nextPhase,
                },
              });

              if (data2?.no_drivers || data2?.new_requests === 0) {
                setStatus('no_drivers');
                onExpired();
                isExtendingRef.current = false;
                return;
              }

              setPhase(nextConfig.nextPhase!);
              setExtendedDriverCount(data2?.drivers_found || 0);
              setCurrentTimeoutAt(data2?.timeout_at || new Date(Date.now() + 60000).toISOString());
              setStatus('extended_searching');
            } else {
              setStatus('no_drivers');
              onExpired();
            }
            isExtendingRef.current = false;
            return;
          }

          setPhase(targetPhase!);
          setExtendedDriverCount(data?.drivers_found || 0);
          setCurrentTimeoutAt(data?.timeout_at || new Date(Date.now() + 60000).toISOString());
          setStatus('extended_searching');
        } catch (err) {
          console.error('Extended search error:', err);
          setStatus('no_drivers');
          onExpired();
        }
        isExtendingRef.current = false;
      }, 2000);
    } else {
      // Final phase expired
      setStatus('no_drivers');
      onExpired();
      isExtendingRef.current = false;
    }
  }, [requestGroupId, requestId, onExpired]);

  // Realtime subscription - listens for ANY accepted request in the group
  const acceptedRef = useRef(false);
  useEffect(() => {
    const groupId = requestGroupId || requestId;

    const channel = supabase
      .channel(`waiting-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ride_requests',
          filter: `request_group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newStatus = payload.new?.status;
          if (newStatus === 'accepted' && !acceptedRef.current) {
            acceptedRef.current = true;
            const driverId = payload.new?.accepted_by_driver_id || payload.new?.selected_driver_id;
            const finalCourseId = payload.new?.final_course_id;
            if (driverId) {
              const { data: driver } = await supabase
                .from('drivers')
                .select('profiles:user_id(full_name), company_name')
                .eq('id', driverId)
                .single();
              const name = (driver as any)?.profiles?.full_name || (driver as any)?.company_name || 'Chauffeur';
              setAcceptedDriverName(name);
              onAccepted(name, finalCourseId || undefined);
            }
            setStatus('accepted');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, requestGroupId, onAccepted]);

  // Cancel all requests in the group
  const handleCancel = useCallback(async () => {
    setIsCancelling(true);
    try {
      const groupId = requestGroupId || requestId;
      const { error } = await supabase
        .from('ride_requests')
        .update({ status: 'cancelled' })
        .eq('request_group_id', groupId)
        .in('status', ['pending', 'searching']);
      if (error) {
        console.error('Cancel DB error:', error);
        toast.error("Erreur lors de l'annulation, veuillez réessayer");
        return;
      }
      setStatus('cancelled');
      onCancel();
    } catch (err) {
      console.error('Cancel error:', err);
      toast.error("Erreur lors de l'annulation");
    } finally {
      setIsCancelling(false);
    }
  }, [requestId, requestGroupId, onCancel]);

  const totalTime = PHASE_CONFIG[phase].timeout;
  const progressPercent = (timeLeft / totalTime) * 100;
  const timerColor = timeLeft > 40 ? 'text-green-500' : timeLeft > 20 ? 'text-amber-500' : 'text-destructive';
  const barColor = timeLeft > 40 ? 'bg-green-500' : timeLeft > 20 ? 'bg-amber-500' : 'bg-destructive';
  const phaseMessage = getPhaseMessage();

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-xl">
        {/* Progress bar */}
        {(status === 'searching' || status === 'extended_searching' || status === 'relaunching') && (
          <div className="h-1.5 bg-muted">
            <motion.div
              className={`h-full ${barColor}`}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
        )}

        <CardContent className="pt-8 pb-8 text-center space-y-5">
          <AnimatePresence mode="wait">
            {/* SEARCHING */}
            {(status === 'searching' || status === 'extended_searching' || status === 'relaunching') && (
              <motion.div
                key={`searching-${phase}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative mx-auto w-20 h-20"
              >
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/20"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/15"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
                <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  >
                    {phaseMessage.icon}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* TRANSITION */}
            {status === 'transition' && (
              <motion.div
                key="transition"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="w-20 h-20 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto"
              >
                <RefreshCw className="h-10 w-10 text-amber-500 animate-spin" />
              </motion.div>
            )}

            {/* ACCEPTED */}
            {status === 'accepted' && (
              <motion.div
                key="accepted"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </motion.div>
            )}

            {/* NO DRIVERS / EXPIRED */}
            {(status === 'no_drivers' || status === 'expired' || status === 'rejected') && (
              <motion.div
                key="failed"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mx-auto"
              >
                <XCircle className="h-10 w-10 text-destructive" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status text */}
          <AnimatePresence mode="wait">
            {(status === 'searching' || status === 'extended_searching' || status === 'relaunching') && (
              <motion.div
                key={`text-${phase}`}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="space-y-2"
              >
                <h3 className="text-lg font-bold">{phaseMessage.title}</h3>
                <p className="text-sm text-muted-foreground">{phaseMessage.subtitle}</p>
                {phase !== 'selected' && extendedDriverCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {extendedDriverCount} chauffeur{extendedDriverCount > 1 ? 's' : ''} contacté{extendedDriverCount > 1 ? 's' : ''} à proximité
                  </p>
                )}
              </motion.div>
            )}

            {status === 'transition' && (
              <motion.div
                key="text-transition"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className="space-y-2"
              >
                <h3 className="text-lg font-bold">
                  {phase === 'selected'
                    ? 'Vos chauffeurs sélectionnés ne sont pas disponibles'
                    : 'Recherche de nouveaux chauffeurs…'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Nous élargissons la recherche pour trouver un chauffeur disponible.
                </p>
              </motion.div>
            )}

            {status === 'accepted' && (
              <motion.div
                key="text-accepted"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-2"
              >
                <h3 className="text-lg font-bold text-green-600 dark:text-green-400">
                  Chauffeur trouvé ! 🎉
                </h3>
                <p className="text-sm text-muted-foreground">
                  {acceptedDriverName || 'Votre chauffeur'} a accepté votre course.
                </p>
              </motion.div>
            )}

            {status === 'no_drivers' && (
              <motion.div
                key="text-nodriver"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-2"
              >
                <h3 className="text-lg font-bold">Aucun chauffeur disponible pour le moment</h3>
                <p className="text-sm text-muted-foreground">
                  Nous avons contacté tous les chauffeurs à proximité mais aucun n'est disponible actuellement.
                </p>
              </motion.div>
            )}

            {(status === 'expired' || status === 'rejected') && (
              <motion.div
                key="text-expired"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-2"
              >
                <h3 className="text-lg font-bold">Délai expiré</h3>
                <p className="text-sm text-muted-foreground">
                  Le temps de réponse est écoulé. Vous pouvez relancer une recherche.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Timer */}
          {(status === 'searching' || status === 'extended_searching' || status === 'relaunching') && (
            <div className="flex items-center justify-center gap-2">
              <Clock className={`h-4 w-4 ${timerColor}`} />
              <span className={`text-sm font-mono font-bold ${timerColor}`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Phase indicator */}
          <div className="flex justify-center gap-2">
            {phase === 'selected' && (
              requestType === 'exclusive' ? (
                <Badge className="gap-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                  <Crown className="h-3.5 w-3.5" />
                  Demande exclusive
                </Badge>
              ) : (
                <Badge className="gap-1.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  <Users className="h-3.5 w-3.5" />
                  {driverCount} chauffeurs contactés
                </Badge>
              )
            )}
            {phase === 'relaunch' && (
              <Badge className="gap-1.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                <RefreshCw className="h-3.5 w-3.5" />
                Relance ({extendedDriverCount} chauffeur{extendedDriverCount > 1 ? 's' : ''})
              </Badge>
            )}
            {phase === 'nearby' && (
              <Badge className="gap-1.5 bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30">
                <Search className="h-3.5 w-3.5" />
                Recherche élargie (5 km)
              </Badge>
            )}
            {phase === 'extended' && (
              <Badge className="gap-1.5 bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30">
                <MapPin className="h-3.5 w-3.5" />
                Zone étendue (10+ km)
              </Badge>
            )}
          </div>

          {/* Phase progress dots */}
          {(status === 'searching' || status === 'extended_searching' || status === 'relaunching' || status === 'transition') && (
            <div className="flex justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${phase === 'selected' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              <div className={`w-2 h-2 rounded-full ${phase === 'relaunch' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              <div className={`w-2 h-2 rounded-full ${phase === 'nearby' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              <div className={`w-2 h-2 rounded-full ${phase === 'extended' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Animated driver cards carousel */}
      {(status === 'searching' || status === 'extended_searching' || status === 'relaunching' || status === 'transition') && (
        <>
          {contactedDriversData && contactedDriversData.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Chauffeurs contactés ({contactedDriversData.length})
                </h4>
                {contactedDriversData.length >= 2 && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => carouselRef.current?.scrollBy({ left: -180, behavior: 'smooth' })}
                      className="w-7 h-7 rounded-full bg-background/90 border border-border shadow flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => carouselRef.current?.scrollBy({ left: 180, behavior: 'smooth' })}
                      className="w-7 h-7 rounded-full bg-background/90 border border-border shadow flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div
                ref={carouselRef}
                className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-1 px-1"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {contactedDriversData.map((driver, index) => {
                  // Find status from polled data
                  const driverStatus = contactedDrivers.find(d => d.driver_id === driver.driver_id);
                  const isAccepted = driverStatus?.status === 'accepted';
                  const isRejected = driverStatus?.status === 'rejected';
                  return (
                    <motion.div
                      key={driver.driver_id}
                      className="snap-start shrink-0 w-[160px] min-h-[280px] relative"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <DriverResultCard
                        driver={driver}
                        routeDistanceKm={routeDistanceKm}
                        isSelected={true}
                        onToggleSelect={() => {}}
                        onViewProfile={() => {}}
                        rank={index + 1}
                        clientPaymentMethod={clientPaymentMethod}
                      />
                      {/* Status overlay */}
                      {(isAccepted || isRejected) && (
                        <div className={`absolute inset-0 rounded-2xl flex items-center justify-center ${isAccepted ? 'bg-green-500/20' : 'bg-destructive/20'} backdrop-blur-[1px] z-10`}>
                          <Badge className={`text-xs gap-1 ${isAccepted ? 'bg-green-500 text-white' : 'bg-destructive text-white'}`}>
                            {isAccepted ? <><CheckCircle2 className="h-3 w-3" /> Accepté</> : <><XCircle className="h-3 w-3" /> Refusé</>}
                          </Badge>
                        </div>
                      )}
                      {driverStatus?.status === 'pending' && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                          <motion.div
                            className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : contactedDrivers.length > 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-3 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Chauffeurs contactés ({contactedDrivers.length})
                </h4>
                <div className="space-y-1.5">
                  {contactedDrivers.map((d) => (
                    <div key={d.driver_id} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarImage src={d.photo_url || undefined} />
                        <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                          {d.driver_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm font-medium truncate">{d.driver_name}</span>
                      {d.status === 'pending' && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/30 text-amber-600">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" /> En attente
                        </Badge>
                      )}
                      {d.status === 'accepted' && (
                        <Badge className="text-[10px] gap-1 bg-green-500/15 text-green-600 border-green-500/30">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Accepté
                        </Badge>
                      )}
                      {d.status === 'rejected' && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-destructive/30 text-destructive">
                          <XCircle className="h-2.5 w-2.5" /> Refusé
                        </Badge>
                      )}
                      {d.status === 'expired' && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-muted-foreground/30 text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" /> Pas de réponse
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {/* Route Summary */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center mt-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <div className="w-0.5 h-10 bg-gradient-to-b from-green-500 to-primary" />
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <p className="text-xs text-muted-foreground">Départ</p>
                <p className="text-sm font-medium truncate">{pickupAddress}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Arrivée</p>
                <p className="text-sm font-medium truncate">{destinationAddress}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 mt-4 border-t">
            <span className="text-sm text-muted-foreground">Prix estimé</span>
            <span className="text-lg font-bold text-primary">{estimatedPrice.toFixed(2)}€</span>
          </div>
        </CardContent>
      </Card>

      {/* Cancel button */}
      {(status === 'searching' || status === 'extended_searching' || status === 'transition') && (
        <Button
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
          size="lg"
          onClick={handleCancel}
          disabled={isCancelling}
        >
          {isCancelling ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <X className="h-4 w-4 mr-2" />
          )}
          Annuler la demande
        </Button>
      )}

      {/* Failure actions */}
      {(status === 'no_drivers' || status === 'expired' || status === 'rejected') && (
        <div className="space-y-3">
          <Button className="w-full" size="lg" onClick={onCancel}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Relancer une recherche
          </Button>
          <Button variant="outline" className="w-full" size="lg" onClick={() => window.history.back()}>
            <CalendarClock className="h-4 w-4 mr-2" />
            Changer l'horaire
          </Button>
        </div>
      )}
    </div>
  );
}
