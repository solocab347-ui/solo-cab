/**
 * Composant invisible — initialise le logger d'observabilité + bridge Capacitor App state
 * dès qu'un utilisateur est connecté. Lié au cycle de vie de useAuth pour récupérer
 * driver_id et user_id sans dépendance circulaire.
 */
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { realtimeHealthLogger } from '@/lib/realtimeHealthLogger';
import { initNativeAppStateBridge } from '@/lib/nativeAppState';
import { supabase } from '@/integrations/supabase/client';

export function ObservabilityBoot() {
  const { user, userRole } = useAuth();

  useEffect(() => {
    initNativeAppStateBridge();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      realtimeHealthLogger.reset();
      return;
    }

    let cancelled = false;
    (async () => {
      let driverId: string | null = null;
      if (userRole === 'driver') {
        const { data } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        driverId = data?.id ?? null;
      }
      if (cancelled) return;
      realtimeHealthLogger.init({ userId: user.id, driverId });
    })();

    return () => { cancelled = true; };
  }, [user?.id, userRole]);

  return null;
}
