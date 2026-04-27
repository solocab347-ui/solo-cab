import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Nouveau modèle : il n'y a plus de "demandes de partenariat" à valider.
 * On ne compte plus que les courses partagées en attente d'acceptation.
 */
export function usePartnershipNotificationCount(driverId: string | null) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!driverId) {
      setCount(0);
      return;
    }

    const { count: poolCount } = await supabase
      .from('partner_course_pool')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available')
      .gt('expires_at', new Date().toISOString());

    const { count: sharedPending } = await supabase
      .from('shared_courses')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_driver_id', driverId)
      .eq('status', 'pending');

    setCount((poolCount || 0) + (sharedPending || 0));
  }, [driverId]);

  useEffect(() => {
    refresh();
    if (!driverId) return;

    const channel = supabase
      .channel(`partnership-notif-${driverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_course_pool' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_courses' }, refresh)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverId, refresh]);

  const markPartnershipNotificationsAsRead = useCallback(() => {
    // Plus de "demande" à acquitter dans le nouveau modèle.
    setCount(0);
  }, []);

  return { count, refresh, markPartnershipNotificationsAsRead };
}
