import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour mettre à jour last_seen_at du chauffeur.
 * Appelé au chargement et throttled à 5 minutes.
 */
export function useUpdateLastSeen(driverId: string | null | undefined) {
  const lastUpdate = useRef<number>(0);
  const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (!driverId) return;

    const now = Date.now();
    if (now - lastUpdate.current < THROTTLE_MS) return;

    const updateLastSeen = async () => {
      try {
        await supabase
          .from('drivers')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', driverId);
        lastUpdate.current = now;
      } catch (error) {
        console.error('Erreur mise à jour last_seen_at:', error);
      }
    };

    updateLastSeen();
  }, [driverId]);
}
