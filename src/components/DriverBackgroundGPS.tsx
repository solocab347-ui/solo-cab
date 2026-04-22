/**
 * Composant invisible : démarre/arrête le foreground service GPS chauffeur
 * dès que le chauffeur passe en ligne (et l'arrête à la déconnexion).
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useDriverBackgroundGPS } from '@/hooks/useDriverBackgroundGPS';

export function DriverBackgroundGPS() {
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  // Récupérer driver_id + état online
  useEffect(() => {
    if (!user?.id) {
      setDriverId(null);
      setEnabled(false);
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase
        .from('drivers')
        .select('id, is_available_now')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data) return;
      setDriverId(data.id);
      setEnabled(!!data.is_available_now);

      // Écoute realtime du statut driver
      channel = supabase
        .channel(`driver-bg-gps-${data.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `id=eq.${data.id}`,
        }, (payload) => {
          const next = payload.new as { is_available_now?: boolean };
          setEnabled(!!next.is_available_now);
        })
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useDriverBackgroundGPS({ driverId, enabled });

  return null;
}
