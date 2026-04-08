import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playAvailabilitySound } from '@/lib/availabilitySound';

/**
 * Driver status state machine (SoloCab intelligent):
 * - 'offline'   → Hors ligne: pas de courses immédiates, reçoit réservations >2h
 * - 'online'    → En ligne: courses immédiates + réservations futures
 * - 'assigned'  → Course assignée: pas de nouvelles courses immédiates, réservations futures OK
 * - 'in_ride'   → En course: pas visible immédiat, réservations lointaines uniquement
 * - 'break'     → En pause: rien du tout
 * 
 * "isOnline" = driver chose to go online (online, assigned, in_ride)
 * "isAvailableForCourses" = 'online' specifically (immediate rides)
 */

interface DriverAvailabilityContextType {
  /** True if driver is connected (not offline/break) */
  isOnline: boolean;
  /** True if driver is available for new immediate courses (online) */
  isAvailableForCourses: boolean;
  /** Current driver_status */
  driverStatus: string;
  isLoading: boolean;
  /** Toggle between offline ↔ online (user action) */
  toggleOnline: () => Promise<void>;
  /** Set break mode */
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
  isLoading: true,
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

export function DriverAvailabilityProvider({ driverId, children }: Props) {
  const [driverStatus, setDriverStatus] = useState<string>('offline');
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const isOnline = CONNECTED_STATUSES.includes(driverStatus);
  const isAvailableForCourses = driverStatus === 'online';

  useEffect(() => {
    mountedRef.current = true;

    const fetchStatus = async () => {
      const { data: driverData } = await supabase
        .from('drivers')
        .select('driver_status')
        .eq('id', driverId)
        .maybeSingle();

      let nextStatus = driverData?.driver_status || 'offline';

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

        // Also check for accepted courses (assigned state should persist)
        const { count: acceptedCount } = await supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('driver_id', driverId)
          .eq('status', 'accepted');

        if (!hasPendingIncoming && !acceptedCount) {
          nextStatus = 'online';
          await supabase
            .from('drivers')
            .update({ driver_status: nextStatus, is_available_now: true })
            .eq('id', driverId);
        }
      } else if (nextStatus === 'in_ride') {
        const { data: activeCourses } = await supabase
          .from('courses')
          .select('id, status, devis(status)')
          .eq('driver_id', driverId)
          .in('status', ['accepted', 'in_progress'])
          .order('updated_at', { ascending: false })
          .limit(5);

        const courses = (activeCourses ?? []) as any[];
        const hasInProgress = courses.some((course) => course.status === 'in_progress');
        const hasAccepted = courses.some(
          (course) => course.status === 'accepted' || (course.devis ?? []).some((quote: any) => quote.status === 'accepted')
        );
        const reconciledStatus = hasInProgress ? 'in_ride' : hasAccepted ? 'assigned' : 'online';

        if (reconciledStatus !== nextStatus) {
          nextStatus = reconciledStatus;
          await supabase
            .from('drivers')
            .update({
              driver_status: nextStatus,
              is_available_now: nextStatus === 'online',
            })
            .eq('id', driverId);
        }
      }

      if (!mountedRef.current) return;
      setDriverStatus(nextStatus);
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
          if (newData?.driver_status) {
            if (['assigned', 'in_ride'].includes(newData.driver_status)) {
              fetchStatus();
            } else {
              setDriverStatus(newData.driver_status);
            }
          }
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  const toggleOnline = useCallback(async () => {
    // GUARD: Never toggle away from in_ride/assigned — only user can toggle offline ↔ online
    if (BUSY_STATUSES.includes(driverStatus)) {
      console.warn('[DriverAvailability] Cannot toggle while in status:', driverStatus);
      return;
    }
    // If on break, go back to online
    const newOnline = driverStatus === 'break' ? true : !isOnline;
    const newStatus = newOnline ? 'online' : 'offline';
    setDriverStatus(newStatus);
    await supabase
      .from('drivers')
      .update({
        is_available_now: newOnline,
        driver_status: newStatus,
      })
      .eq('id', driverId);
    playAvailabilitySound(newOnline);
  }, [isOnline, driverStatus, driverId]);

  const toggleBreak = useCallback(async () => {
    if (BUSY_STATUSES.includes(driverStatus)) {
      console.warn('[DriverAvailability] Cannot take break while busy:', driverStatus);
      return;
    }
    const isBreak = driverStatus === 'break';
    const newStatus = isBreak ? 'online' : 'break';
    setDriverStatus(newStatus);
    await supabase
      .from('drivers')
      .update({
        is_available_now: newStatus === 'online',
        driver_status: newStatus,
      })
      .eq('id', driverId);
  }, [driverStatus, driverId]);

  // Legacy compat
  const setAvailabilityDirect = useCallback(async (val: boolean) => {
    const newStatus = val ? 'online' : 'offline';
    setDriverStatus(newStatus);
    await supabase
      .from('drivers')
      .update({
        is_available_now: val,
        driver_status: newStatus,
      })
      .eq('id', driverId);
  }, [driverId]);

  return (
    <DriverAvailabilityContext.Provider value={{
      isOnline,
      isAvailableForCourses,
      driverStatus,
      isLoading,
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
