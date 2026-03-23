import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

    const syncDriverAvailability = async () => {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!driver?.id || isCancelled) return;

      await supabase
        .from('drivers')
        .update({
          is_available_now: true,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', driver.id);
    };

    void syncDriverAvailability();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncDriverAvailability();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    intervalRef.current = window.setInterval(() => {
      void syncDriverAvailability();
    }, 60000);

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