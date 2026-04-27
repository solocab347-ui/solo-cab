import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscriptionManager } from '@/lib/subscriptionManager';
import { toast } from 'sonner';

export interface QueuedCourse {
  id: string;
  course_id: string;
  driver_id: string;
  conflict_reason: string;
  conflicting_course_id: string | null;
  source_type: 'client' | 'fleet_manager' | 'partner';
  source_id: string | null;
  buffer_minutes_needed: number | null;
  actual_gap_minutes: number | null;
  priority: number;
  status: 'pending' | 'resolved' | 'shared' | 'forced' | 'returned';
  resolved_at: string | null;
  resolved_action: string | null;
  shared_to_driver_id: string | null;
  auto_check_enabled: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  course?: {
    id: string;
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
    duration_minutes: number | null;
    passengers_count: number;
    status: string;
    guest_name: string | null;
    guest_phone: string | null;
    clients?: {
      id: string;
      user_id: string;
      profiles?: {
        full_name: string;
        phone: string | null;
      };
    };
    devis?: Array<{
      amount: number;
    }>;
  };
  conflicting_course?: {
    id: string;
    pickup_address: string;
    destination_address: string;
    scheduled_date: string;
  };
}

interface UseCourseQueueOptions {
  driverId: string | null;
  autoRefresh?: boolean;
}

export function useCourseQueue({ driverId, autoRefresh = true }: UseCourseQueueOptions) {
  const [queue, setQueue] = useState<QueuedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = useCallback(async () => {
    if (!driverId) {
      setQueue([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('course_queue')
        .select(`
          *,
          course:courses!course_queue_course_id_fkey(
            id,
            pickup_address,
            destination_address,
            scheduled_date,
            duration_minutes,
            passengers_count,
            status,
            guest_name,
            guest_phone,
            clients(
              id,
              user_id,
              profiles:profiles(full_name, phone)
            ),
            devis(amount)
          ),
          conflicting_course:courses!course_queue_conflicting_course_id_fkey(
            id,
            pickup_address,
            destination_address,
            scheduled_date
          )
        `)
        .eq('driver_id', driverId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQueue((data || []) as unknown as QueuedCourse[]);
    } catch (error) {
      console.error('Error fetching course queue:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverId]);

  // Force accept a course despite buffer conflict
  const forceAcceptCourse = async (queueId: string, courseId: string) => {
    try {
      const { error } = await supabase
        .from('course_queue')
        .update({
          status: 'forced',
          resolved_at: new Date().toISOString(),
          resolved_action: 'forced',
          updated_at: new Date().toISOString()
        })
        .eq('id', queueId);

      if (error) throw error;

      // Update local state
      setQueue(prev => prev.filter(q => q.id !== queueId));
      toast.success('Course acceptée malgré le conflit');
      return true;
    } catch (error) {
      console.error('Error forcing course:', error);
      toast.error('\'Erreur lors de lacceptation forcée');
      return false;
    }
  };

  // Share course with a partner (PREMIUM ONLY - caller must verify premium status)
  const shareWithPartner = async (queueId: string, courseId: string, partnerId: string) => {
    try {
      // Get course price
      const { data: devis } = await supabase
        .from('devis')
        .select('amount')
        .eq('course_id', courseId)
        .eq('status', 'accepted')
        .limit(1);

      const courseAmount = devis?.[0]?.amount || 0;
      const commissionPercentage = 20; // default commission
      const commissionAmount = (courseAmount * commissionPercentage) / 100;

      // Create shared course entry
      const { error: shareError } = await supabase
        .from('shared_courses')
        .insert({
          course_id: courseId,
          sender_driver_id: driverId,
          receiver_driver_id: partnerId,
          course_amount: courseAmount,
          commission_percentage: commissionPercentage,
          commission_amount: commissionAmount,
          status: 'pending',
          sharing_mode: 'direct'
        });

      if (shareError) throw shareError;

      // Update queue
      const { error: queueError } = await supabase
        .from('course_queue')
        .update({
          status: 'shared',
          resolved_at: new Date().toISOString(),
          resolved_action: 'shared',
          shared_to_driver_id: partnerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', queueId);

      if (queueError) throw queueError;

      setQueue(prev => prev.filter(q => q.id !== queueId));
      toast.success('Course partagée avec votre partenaire');
      return true;
    } catch (error) {
      console.error('Error sharing course:', error);
      toast.error('Erreur lors du partage');
      return false;
    }
  };

  // Return course to fleet manager
  const returnToFleetManager = async (queueId: string, courseId: string) => {
    try {
      // Update course status
      const { error: courseError } = await supabase
        .from('courses')
        .update({
          status: 'pending',
          driver_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId);

      if (courseError) throw courseError;

      // Update queue
      const { error: queueError } = await supabase
        .from('course_queue')
        .update({
          status: 'returned',
          resolved_at: new Date().toISOString(),
          resolved_action: 'returned',
          updated_at: new Date().toISOString()
        })
        .eq('id', queueId);

      if (queueError) throw queueError;

      setQueue(prev => prev.filter(q => q.id !== queueId));
      toast.success('Course retournée au gestionnaire');
      return true;
    } catch (error) {
      console.error('Error returning course:', error);
      toast.error('Erreur lors du retour');
      return false;
    }
  };

  // Trigger auto-place check
  const checkAutoPlace = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.rpc('try_auto_place_queued_courses');
      if (error) throw error;
      
      const placedCount = (data || []).filter((r: { placed: boolean }) => r.placed).length;
      if (placedCount > 0) {
        toast.success(`${placedCount} course(s) placée(s) automatiquement`);
      }
      
      await fetchQueue();
    } catch (error) {
      console.error('Error checking auto-place:', error);
      setRefreshing(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Auto-refresh every 15 minutes to check for auto-placement opportunities
  useEffect(() => {
    if (!driverId || !autoRefresh) return;

    const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
    
    const intervalId = setInterval(() => {
      console.log('Auto-refresh: checking queue placement opportunities...');
      checkAutoPlace();
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [driverId, autoRefresh]);

  // Realtime subscription via centralized manager
  useEffect(() => {
    if (!driverId || !autoRefresh) return;

    const cleanupQueue = subscriptionManager.subscribe(
      `course-queue-changes-${driverId}`,
      { table: 'course_queue', event: '*', filter: `driver_id=eq.${driverId}`, debounceMs: 500 },
      () => fetchQueue()
    );

    const cleanupCourses = subscriptionManager.subscribe(
      `course-queue-courses-${driverId}`,
      { table: 'courses', event: '*', filter: `driver_id=eq.${driverId}`, debounceMs: 500 },
      () => checkAutoPlace()
    );

    return () => {
      cleanupQueue();
      cleanupCourses();
    };
  }, [driverId, autoRefresh, fetchQueue]);

  return {
    queue,
    loading,
    refreshing,
    refresh: fetchQueue,
    forceAcceptCourse,
    shareWithPartner,
    returnToFleetManager,
    checkAutoPlace
  };
}
