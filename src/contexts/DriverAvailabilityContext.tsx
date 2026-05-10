import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playAvailabilitySound } from '@/lib/availabilitySound';
import { deriveDriverStatusFromCourses } from '@/lib/driverCourseLifecycle';
import { ensureLocationPermission } from '@/lib/ensureLocationPermission';
import { getCurrentLocation } from '@/lib/geoService';
import { toast } from 'sonner';

/**
 * Single source of truth for the driver status.
 * Lifecycle:
 *   offline → driver chose to disconnect
 *   online  → driver is available for immediate rides + reservations
 *   break   → driver paused, no rides
 *   assigned/in_ride → owned by the active course, the toggle is locked
 *
 * All status changes go through `set_driver_availability_atomic` so
 * driver_status, is_available_now, GPS columns and freshness move together.
 */

interface DriverAvailabilityContextType {
  /** True if driver is connected (online | assigned | in_ride) */
  isOnline: boolean;
  /** True if driver is available for new immediate courses (strictly online) */
  isAvailableForCourses: boolean;
  /** Current driver_status string */
  driverStatus: string;
  /** Current `is_available_now` flag from DB */
  isAvailableNow: boolean;
  /** Initial fetch in progress */
  isLoading: boolean;
  /** A toggle/break mutation is in flight */
  isToggling: boolean;
  /** Toggle between offline ↔ online (user action) */
  toggleOnline: () => Promise<void>;
  /** Toggle between online ↔ break */
  toggleBreak: () => Promise<void>;
  /** Legacy compat */
  isAvailable: boolean;
  toggleAvailability: () => Promise<void>;
  setAvailabilityDirect: (val: boolean) => Promise<void>;
}

const DriverAvailabilityContext = createContext<DriverAvailabilityContextType>({
  isOnline: false,
  isAvailableForCourses: false,
  driverStatus: 'offline',
  isAvailableNow: false,
  isLoading: true,
  isToggling: false,
  toggleOnline: async () => {},
  toggleBreak: async () => {},
  isAvailable: false,
  toggleAvailability: async () => {},
  setAvailabilityDirect: async () => {},
});

export function useDriverAvailability() {
  return useContext(DriverAvailabilityContext);
}

interface Props {
  driverId: string;
  children: ReactNode;
}

const CONNECTED_STATUSES = ['online', 'assigned', 'in_ride'];
const BUSY_STATUSES = ['in_ride', 'assigned'];

type AvailabilityTarget = 'online' | 'offline' | 'break';

export function DriverAvailabilityProvider({ driverId, children }: Props) {
  const [driverStatus, setDriverStatus] = useState<string>('offline');
  const [isAvailableNow, setIsAvailableNow] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const mountedRef = useRef(true);
  const inFlightRef = useRef<Promise<void> | null>(null);

  // The map / dashboard buttons should only consider the driver "online"
  // when BOTH driver_status === 'online' AND is_available_now === true.
  // For busy statuses the flag is irrelevant — the course owns the state.
  const isBusyStatus = BUSY_STATUSES.includes(driverStatus);
  const isOnline = isBusyStatus || (driverStatus === 'online' && isAvailableNow);
  const isAvailableForCourses = driverStatus === 'online' && isAvailableNow;

  const applyDriverRow = useCallback((row: { driver_status?: string | null; is_available_now?: boolean | null } | null) => {
    if (!row) return;
    if (typeof row.driver_status === 'string') setDriverStatus(row.driver_status);
    if (typeof row.is_available_now === 'boolean') setIsAvailableNow(row.is_available_now);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const fetchStatus = async () => {
      const { data: driverData } = await supabase
        .from('drivers')
        .select('driver_status, is_available_now')
        .eq('id', driverId)
        .maybeSingle();

      let nextStatus = driverData?.driver_status || 'offline';
      let nextAvailable = !!driverData?.is_available_now;

      if (nextStatus === 'assigned') {
        const nowIso = new Date().toISOString();
        const recentCourseIso = new Date(Date.now() - 60_000).toISOString();

        const [rideRequests, queueItems, sharedItems, directCourses] = await Promise.all([
          supabase
            .from('ride_requests')
            .select('id', { count: 'exact', head: true })
            .eq('selected_driver_id', driverId)
            .eq('status', 'pending'),
          supabase
            .from('course_queue')
            .select('id', { count: 'exact', head: true })
            .eq('driver_id', driverId)
            .eq('status', 'pending')
            .gt('expires_at', nowIso),
          supabase
            .from('shared_courses')
            .select('id', { count: 'exact', head: true })
            .eq('receiver_driver_id', driverId)
            .eq('status', 'pending'),
          supabase
            .from('courses')
            .select('id', { count: 'exact', head: true })
            .eq('driver_id', driverId)
            .in('status', ['pending', 'accepted'])
            .gt('created_at', recentCourseIso),
        ]);

        const hasPendingIncoming = [rideRequests, queueItems, sharedItems, directCourses].some(
          (result) => Number(result.count || 0) > 0
        );

        const { data: activeCourses } = await supabase
          .from('courses')
          .select('id, status, scheduled_date, created_at, updated_at, devis(status, accepted_at, created_at)')
          .eq('driver_id', driverId)
          .in('status', ['pending', 'accepted', 'driver_approaching', 'driver_arrived', 'in_progress'] as any[])
          .order('updated_at', { ascending: false })
          .limit(10);

        let reconciledBusyStatus = deriveDriverStatusFromCourses((activeCourses ?? []) as any[]);

        // RACE-CONDITION GUARD: drivers UPDATE event can arrive BEFORE the
        // courses INSERT propagates via Realtime. If we don't see a course yet,
        // wait 1.5s and retry once before resetting to online.
        if (!hasPendingIncoming && !reconciledBusyStatus) {
          await new Promise((r) => setTimeout(r, 1500));
          const { data: retryCourses } = await supabase
            .from('courses')
            .select('id, status, scheduled_date, created_at, updated_at, devis(status, accepted_at, created_at)')
            .eq('driver_id', driverId)
            .in('status', ['pending', 'accepted', 'driver_approaching', 'driver_arrived', 'in_progress'] as any[])
            .order('updated_at', { ascending: false })
            .limit(10);
          reconciledBusyStatus = deriveDriverStatusFromCourses((retryCourses ?? []) as any[]);
        }

        if (!hasPendingIncoming && !reconciledBusyStatus) {
          nextStatus = 'online';
          nextAvailable = true;
          await supabase
            .from('drivers')
            .update({ driver_status: nextStatus, is_available_now: true })
            .eq('id', driverId);
        } else if (reconciledBusyStatus && reconciledBusyStatus !== nextStatus) {
          nextStatus = reconciledBusyStatus;
          nextAvailable = false;
          await supabase
            .from('drivers')
            .update({
              driver_status: nextStatus,
              is_available_now: false,
            })
            .eq('id', driverId);
        }
      } else if (nextStatus === 'in_ride') {
        const { data: activeCourses } = await supabase
          .from('courses')
          .select('id, status, scheduled_date, created_at, updated_at, devis(status, accepted_at, created_at)')
          .eq('driver_id', driverId)
          .in('status', ['accepted', 'driver_approaching', 'driver_arrived', 'in_progress'] as any[])
          .order('updated_at', { ascending: false })
          .limit(5);

        const courses = (activeCourses ?? []) as any[];
        const reconciledStatus = deriveDriverStatusFromCourses(courses) ?? 'online';

        if (reconciledStatus !== nextStatus) {
          nextStatus = reconciledStatus;
          nextAvailable = nextStatus === 'online';
          await supabase
            .from('drivers')
            .update({
              driver_status: nextStatus,
              is_available_now: nextAvailable,
            })
            .eq('id', driverId);
        }
      }

      if (!mountedRef.current) return;
      setDriverStatus(nextStatus);
      setIsAvailableNow(nextAvailable);
      setIsLoading(false);
    };

    fetchStatus();

    const channel = supabase
      .channel(`driver-availability-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `id=eq.${driverId}`,
        },
        (payload) => {
          if (!mountedRef.current) return;
          const newData = payload.new as any;
          if (!newData) return;
          if (newData.driver_status && ['assigned', 'in_ride'].includes(newData.driver_status)) {
            // Busy state needs a full refetch so we reconcile with active courses.
            fetchStatus();
          } else {
            applyDriverRow(newData);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses',
          filter: `driver_id=eq.${driverId}`,
        },
        () => {
          fetchStatus();
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [driverId, applyDriverRow]);

  // ── Atomic mutation ──
  const runAtomic = useCallback(
    async (target: AvailabilityTarget) => {
      if (!driverId) return;

      const previousStatus = driverStatus;
      const previousAvailable = isAvailableNow;
      const optimisticStatus = target === 'online' ? 'online' : target === 'break' ? 'break' : 'offline';
      const optimisticAvailable = target === 'online';

      // Optimistic UI — instant feedback even if the network is slow.
      setDriverStatus(optimisticStatus);
      setIsAvailableNow(optimisticAvailable);
      setIsToggling(true);

      try {
        const { data, error } = await supabase.rpc('set_driver_availability_atomic', {
          _driver_id: driverId,
          _target: target,
        });

        if (error) {
          throw error;
        }

        const row = Array.isArray(data) ? data[0] : (data as any);

        if (row?.blocked) {
          // Roll back optimistic change.
          setDriverStatus(previousStatus);
          setIsAvailableNow(previousAvailable);

          if (row.blocked_reason === 'driver_busy') {
            toast.warning('Course en cours — impossible de changer le statut maintenant.');
          } else if (row.blocked_reason === 'forbidden') {
            toast.error('Action non autorisée.');
          } else if (row.blocked_reason === 'driver_not_found') {
            toast.error('Profil chauffeur introuvable.');
          }
          return;
        }

        if (row?.driver_status) {
          setDriverStatus(row.driver_status);
          setIsAvailableNow(!!row.is_available_now);
        }
      } catch (err) {
        console.error('[DriverAvailability] set_driver_availability_atomic failed', err);
        setDriverStatus(previousStatus);
        setIsAvailableNow(previousAvailable);
        toast.error('Connexion instable, réessayez.');
      } finally {
        if (mountedRef.current) {
          setIsToggling(false);
        }
      }
    },
    [driverId, driverStatus, isAvailableNow]
  );

  // Serialize toggles so rapid taps cannot interleave RPC calls.
  const enqueue = useCallback(
    (target: AvailabilityTarget) => {
      const prior = inFlightRef.current;
      const next = (prior ? prior.then(() => runAtomic(target), () => runAtomic(target)) : runAtomic(target));
      inFlightRef.current = next.finally(() => {
        if (inFlightRef.current === next) inFlightRef.current = null;
      });
      return next;
    },
    [runAtomic]
  );

  const toggleOnline = useCallback(async () => {
    if (BUSY_STATUSES.includes(driverStatus)) {
      console.warn('[DriverAvailability] Cannot toggle while in status:', driverStatus);
      return;
    }
    const target: AvailabilityTarget = isOnline ? 'offline' : 'online';
    const willBeOnline = target === 'online';

    // Avant de passer en ligne, on demande explicitement la permission GPS
    // pour que l'utilisateur voie le prompt système ("Autoriser la localisation")
    // et que le foreground service puisse réellement émettre des positions.
    if (willBeOnline) {
      const perm = await ensureLocationPermission();
      if (perm !== 'granted') {
        toast.error("Impossible de passer en ligne sans localisation", {
          description: "Autorise l'accès à la position pour recevoir des courses.",
          duration: 6000,
        });
        return;
      }

      const firstFix = await getCurrentLocation({ enableHighAccuracy: true, timeoutMs: 20_000, maximumAgeMs: 0 });
      if (!firstFix) {
        toast.error("GPS introuvable", {
          description: "Active le GPS précis du téléphone puis réessaie. SoloCab ne réutilise plus une ancienne position.",
          duration: 7000,
        });
        return;
      }

      const { error: gpsError } = await supabase.rpc('update_driver_location_batch', {
        p_driver_id: driverId,
        p_latitude: firstFix.latitude,
        p_longitude: firstFix.longitude,
        p_accuracy: firstFix.accuracy,
      });
      if (gpsError) {
        console.error('[DriverAvailability] initial GPS update failed', gpsError);
        toast.error("Position GPS non enregistrée", {
          description: "Connexion instable : impossible de passer en ligne proprement.",
          duration: 7000,
        });
        return;
      }
    }

    await enqueue(target);
    playAvailabilitySound(willBeOnline);
  }, [driverStatus, isOnline, enqueue]);

  const toggleBreak = useCallback(async () => {
    if (BUSY_STATUSES.includes(driverStatus)) {
      console.warn('[DriverAvailability] Cannot take break while busy:', driverStatus);
      return;
    }
    const target: AvailabilityTarget = driverStatus === 'break' ? 'online' : 'break';
    await enqueue(target);
  }, [driverStatus, enqueue]);

  const setAvailabilityDirect = useCallback(
    async (val: boolean) => {
      await enqueue(val ? 'online' : 'offline');
    },
    [enqueue]
  );

  return (
    <DriverAvailabilityContext.Provider value={{
      isOnline,
      isAvailableForCourses,
      driverStatus,
      isAvailableNow,
      isLoading,
      isToggling,
      toggleOnline,
      toggleBreak,
      // Legacy compat
      isAvailable: isOnline,
      toggleAvailability: toggleOnline,
      setAvailabilityDirect,
    }}>
      {children}
    </DriverAvailabilityContext.Provider>
  );
}
