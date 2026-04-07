import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playAvailabilitySound } from '@/lib/availabilitySound';

/**
 * Driver status state machine:
 * - 'offline'           → truly disconnected, toggle shows "Hors ligne"
 * - 'online_available'  → connected and available for courses, toggle shows "En ligne"
 * - 'accepting'         → receiving a course request (60s window) — still connected
 * - 'on_trip'           → currently on a course — still connected
 * - 'reserved'          → reserved for a specific task — still connected
 * 
 * "isOnline" = driver chose to go online (any status except 'offline')
 * "isAvailableForCourses" = online_available specifically
 */

interface DriverAvailabilityContextType {
  /** True if driver is connected (not offline) — controls the toggle display */
  isOnline: boolean;
  /** True if driver is available for new courses (online_available) */
  isAvailableForCourses: boolean;
  /** Current driver_status */
  driverStatus: string;
  isLoading: boolean;
  /** Toggle between offline ↔ online_available (user action) */
  toggleOnline: () => Promise<void>;
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

const CONNECTED_STATUSES = ['online_available', 'accepting', 'on_trip', 'reserved'];

export function DriverAvailabilityProvider({ driverId, children }: Props) {
  const [driverStatus, setDriverStatus] = useState<string>('offline');
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const isOnline = CONNECTED_STATUSES.includes(driverStatus);
  const isAvailableForCourses = driverStatus === 'online_available';

  useEffect(() => {
    mountedRef.current = true;
    const fetchStatus = async () => {
      const { data } = await supabase
        .from('drivers')
        .select('driver_status')
        .eq('id', driverId)
        .maybeSingle();

      if (!mountedRef.current) return;
      if (data) {
        setDriverStatus(data.driver_status || 'offline');
      }
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
            setDriverStatus(newData.driver_status);
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
    // GUARD: Never toggle away from on_trip/accepting/reserved — only user can toggle offline ↔ online_available
    const busyStatuses = ['on_trip', 'accepting', 'reserved'];
    if (busyStatuses.includes(driverStatus)) {
      console.warn('[DriverAvailability] Cannot toggle while in status:', driverStatus);
      return;
    }
    const newOnline = !isOnline;
    const newStatus = newOnline ? 'online_available' : 'offline';
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

  // Legacy compat
  const setAvailabilityDirect = useCallback(async (val: boolean) => {
    const newStatus = val ? 'online_available' : 'offline';
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
      // Legacy compat
      isAvailable: isOnline,
      toggleAvailability: toggleOnline,
      setAvailabilityDirect,
    }}>
      {children}
    </DriverAvailabilityContext.Provider>
  );
}
