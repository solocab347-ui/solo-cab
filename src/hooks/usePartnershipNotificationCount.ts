import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscriptionManager } from '@/lib/subscriptionManager';

/**
 * Hook to count all partnership-related notifications that require attention:
 * - Unread notifications related to partnerships (link contains tab=partnerships)
 * - Pending shared courses (received)
 * - Pool courses available
 * - Pending partnership modification requests
 * - Pending partnership requests
 * 
 * Also provides a function to mark partnership notifications as read
 */
export function usePartnershipNotificationCount(driverId: string | null) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadNotificationCount = useCallback(async () => {
    if (!driverId) {
      setCount(0);
      setLoading(false);
      return;
    }

    let totalCount = 0;

    try {
      // First, get user_id from driver
      const { data: driverData } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', driverId)
        .single();

      if (driverData?.user_id) {
        setUserId(driverData.user_id);
        
        // Count unread notifications related to partnerships
        const { count: unreadNotifCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', driverData.user_id)
          .eq('is_read', false)
          .like('link', '%tab=partnerships%');

        if (unreadNotifCount) totalCount += unreadNotifCount;
      }

      // 1. Pending shared courses (direct to me)
      const { count: pendingSharedCount } = await supabase
        .from('shared_courses')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_driver_id', driverId)
        .eq('status', 'pending')
        .is('cancelled_at', null);

      if (pendingSharedCount) totalCount += pendingSharedCount;

      // 2. Pool courses available for me (from my partnerships)
      const { data: partnerships } = await supabase
        .from('driver_partnerships')
        .select('driver_a_id, driver_b_id')
        .or(`driver_a_id.eq.${driverId},driver_b_id.eq.${driverId}`)
        .eq('status', 'active');

      if (partnerships && partnerships.length > 0) {
        const partnerIds = partnerships.map(p => 
          p.driver_a_id === driverId ? p.driver_b_id : p.driver_a_id
        );

        const { count: poolCount } = await supabase
          .from('shared_courses')
          .select('*', { count: 'exact', head: true })
          .in('sender_driver_id', partnerIds)
          .eq('sharing_mode', 'pool')
          .eq('status', 'pending')
          .is('cancelled_at', null)
          .is('receiver_driver_id', null);

        if (poolCount) totalCount += poolCount;
      }

      // 3. Pending modification requests FROM partners (not from me)
      const { count: modificationCount } = await supabase
        .from('driver_partnerships')
        .select('*', { count: 'exact', head: true })
        .or(`driver_a_id.eq.${driverId},driver_b_id.eq.${driverId}`)
        .eq('status', 'active')
        .eq('pending_modification', true)
        .neq('pending_modification_by', driverId);

      if (modificationCount) totalCount += modificationCount;

      // 4. Pending partnership requests TO me
      const { count: requestCount } = await supabase
        .from('driver_partnerships')
        .select('*', { count: 'exact', head: true })
        .or(`driver_a_id.eq.${driverId},driver_b_id.eq.${driverId}`)
        .eq('status', 'pending')
        .neq('proposed_by', driverId);

      if (requestCount) totalCount += requestCount;

    } catch (error) {
      console.error('Error loading partnership notification count:', error);
    }

    setCount(totalCount);
    setLoading(false);
  }, [driverId]);

  // Function to mark all partnership notifications as read
  const markPartnershipNotificationsAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .like('link', '%tab=partnerships%');
      
      // Trigger a recount
      loadNotificationCount();
    } catch (error) {
      console.error('Error marking partnership notifications as read:', error);
    }
  }, [userId, loadNotificationCount]);

  useEffect(() => {
    if (!driverId) {
      setCount(0);
      setLoading(false);
      return;
    }

    loadNotificationCount();

    // Realtime subscriptions via centralized manager
    const cleanupShared = subscriptionManager.subscribe(
      `partnership-notifs-shared-${driverId}`,
      { table: 'shared_courses', event: '*', debounceMs: 1000 },
      () => loadNotificationCount()
    );

    const cleanupPartnerships = subscriptionManager.subscribe(
      `partnership-notifs-partnerships-${driverId}`,
      { table: 'driver_partnerships', event: '*', debounceMs: 1000 },
      () => loadNotificationCount()
    );

    const cleanupNotifs = subscriptionManager.subscribe(
      `partnership-notifs-notifs-${driverId}`,
      { table: 'notifications', event: '*', debounceMs: 1000 },
      () => loadNotificationCount()
    );

    return () => {
      cleanupShared();
      cleanupPartnerships();
      cleanupNotifs();
    };
  }, [driverId, loadNotificationCount]);

  return { count, loading, markPartnershipNotificationsAsRead };
}
