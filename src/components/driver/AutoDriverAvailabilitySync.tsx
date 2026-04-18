import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * AutoDriverAvailabilitySync
 * 
 * ONLY updates last_seen_at for heartbeat detection.
 * Does NOT touch is_available_now — that is controlled exclusively
 * by the driver's manual toggle (DriverAvailabilityToggleBig).
 */
export function AutoDriverAvailabilitySync() {
  const { user, userRole } = useAuth();
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user || userRole !== 'driver') {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    let isCancelled = false;

    const syncHeartbeat = async () => {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!driver?.id || isCancelled) return;

      // Only update last_seen_at — never override is_available_now
      await supabase
        .from('drivers')
        .update({
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', driver.id);
    };

    void syncHeartbeat();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    intervalRef.current = window.setInterval(() => {
      void syncHeartbeat();
    }, 300000); // was 120s → 5min (heartbeat is just a safety net)

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, userRole]);

  return null;
}
