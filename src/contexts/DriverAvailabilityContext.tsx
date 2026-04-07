import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playAvailabilitySound } from '@/lib/availabilitySound';

interface DriverAvailabilityContextType {
  isAvailable: boolean;
  isLoading: boolean;
  toggleAvailability: () => Promise<void>;
  setAvailabilityDirect: (val: boolean) => Promise<void>;
}

const DriverAvailabilityContext = createContext<DriverAvailabilityContextType>({
  isAvailable: false,
  isLoading: true,
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

export function DriverAvailabilityProvider({ driverId, children }: Props) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  // Fetch real state from DB once on mount
  useEffect(() => {
    mountedRef.current = true;
    const fetch = async () => {
      const { data } = await supabase
        .from('drivers')
        .select('is_available_now, driver_status')
        .eq('id', driverId)
        .maybeSingle();

      if (!mountedRef.current) return;
      if (data) {
        const val = data.driver_status === 'online_available' || (data.is_available_now ?? false);
        setIsAvailable(val);
      }
      setIsLoading(false);
    };
    fetch();

    // Subscribe to realtime changes on this driver's row
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
          if (newData) {
            const val = newData.driver_status === 'online_available' || (newData.is_available_now ?? false);
            setIsAvailable(val);
          }
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  const setAvailabilityDirect = useCallback(async (val: boolean) => {
    setIsAvailable(val);
    await supabase
      .from('drivers')
      .update({
        is_available_now: val,
        driver_status: val ? 'online_available' : 'offline',
      })
      .eq('id', driverId);
  }, [driverId]);

  const toggleAvailability = useCallback(async () => {
    const next = !isAvailable;
    setIsAvailable(next);
    await supabase
      .from('drivers')
      .update({
        is_available_now: next,
        driver_status: next ? 'online_available' : 'offline',
      })
      .eq('id', driverId);
    playAvailabilitySound(next);
  }, [isAvailable, driverId]);

  return (
    <DriverAvailabilityContext.Provider value={{ isAvailable, isLoading, toggleAvailability, setAvailabilityDirect }}>
      {children}
    </DriverAvailabilityContext.Provider>
  );
}
