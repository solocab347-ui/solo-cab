import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscriptionManager } from '@/lib/subscriptionManager';

export interface IncomingCourse {
  id: string;
  source: 'direct' | 'shared' | 'queue' | 'fleet' | 'ride_request';
  sourceId: string;
  pickupAddress: string;
  destinationAddress: string;
  scheduledDate: string;
  amount: number | null;
  clientName: string | null;
  senderDriverName: string | null;
  commissionPercentage: number | null;
  expiresAt: string | null;
  priority: number;
  receivedAt: number; // timestamp ms
  requestType?: 'exclusive' | 'multi';
  driverCount?: number;
  distanceKm?: number;
}

interface UseIncomingCourseListenerOptions {
  driverId: string | null;
  enabled?: boolean;
}

export function useIncomingCourseListener({ driverId, enabled = true }: UseIncomingCourseListenerOptions) {
  const [incomingCourse, setIncomingCourse] = useState<IncomingCourse | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const lastProcessedRef = useRef<string | null>(null);

  // Check for new courses in the queue
  const checkForNewCourses = useCallback(async () => {
    if (!driverId || !enabled) return;

    try {
      // 1. Check course_queue for pending items
      const { data: queueItems } = await supabase
        .from('course_queue')
        .select(`
          id, course_id, priority, expires_at, conflict_reason,
          course:courses!course_queue_course_id_fkey(
            pickup_address, destination_address, scheduled_date,
            guest_name,
            clients(profiles:user_id(full_name)),
            devis(amount)
          )
        `)
        .eq('driver_id', driverId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('priority', { ascending: false })
        .limit(1);

      if (queueItems?.length) {
        const item = queueItems[0];
        const key = `queue-${item.id}`;
        if (!dismissed.has(key) && lastProcessedRef.current !== key) {
          lastProcessedRef.current = key;
          const course = item.course as any;
          const clientName = course?.clients?.profiles?.full_name || course?.guest_name || null;
          setIncomingCourse({
            id: key,
            source: 'queue',
            sourceId: item.id,
            pickupAddress: course?.pickup_address || '',
            destinationAddress: course?.destination_address || '',
            scheduledDate: course?.scheduled_date || '',
            amount: course?.devis?.[0]?.amount || null,
            clientName,
            senderDriverName: null,
            commissionPercentage: null,
            expiresAt: item.expires_at,
            priority: item.priority || 1,
            receivedAt: Date.now(),
          });
          return;
        }
      }

      // 2. Check shared_courses pending for this driver
      const { data: sharedItems } = await supabase
        .from('shared_courses')
        .select(`
          id, course_id, course_amount, commission_percentage, commission_amount, created_at,
          course:courses!shared_courses_course_id_fkey(
            pickup_address, destination_address, scheduled_date
          ),
          sender_driver:drivers!shared_courses_sender_driver_id_fkey(
            profiles:user_id(full_name)
          )
        `)
        .eq('receiver_driver_id', driverId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (sharedItems?.length) {
        const item = sharedItems[0];
        const key = `shared-${item.id}`;
        if (!dismissed.has(key) && lastProcessedRef.current !== key) {
          lastProcessedRef.current = key;
          const course = item.course as any;
          const sender = item.sender_driver as any;
          setIncomingCourse({
            id: key,
            source: 'shared',
            sourceId: item.id,
            pickupAddress: course?.pickup_address || '',
            destinationAddress: course?.destination_address || '',
            scheduledDate: course?.scheduled_date || '',
            amount: item.course_amount,
            clientName: null,
            senderDriverName: sender?.profiles?.full_name || null,
            commissionPercentage: item.commission_percentage,
            expiresAt: null,
            priority: 2,
            receivedAt: Date.now(),
          });
          return;
        }
      }

      // 3. Check ride_requests for this driver
      const { data: rideRequests } = await supabase
        .from('ride_requests')
        .select('id, pickup_address, destination_address, estimated_price, timeout_at, created_at, request_type, driver_count, distance_km, guest_name, scheduled_date')
        .eq('selected_driver_id', driverId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (rideRequests?.length) {
        const item = rideRequests[0];
        const key = `ride_request-${item.id}`;
        if (!dismissed.has(key) && lastProcessedRef.current !== key) {
          lastProcessedRef.current = key;
          setIncomingCourse({
            id: key,
            source: 'ride_request',
            sourceId: item.id,
            pickupAddress: item.pickup_address || '',
            destinationAddress: item.destination_address || '',
            scheduledDate: item.scheduled_date || '',
            amount: item.estimated_price ? Number(item.estimated_price) : null,
            clientName: item.guest_name || null,
            senderDriverName: null,
            commissionPercentage: null,
            expiresAt: item.timeout_at,
            priority: 5,
            receivedAt: Date.now(),
            requestType: (item as any).request_type || 'exclusive',
            driverCount: (item as any).driver_count || 1,
            distanceKm: item.distance_km ? Number(item.distance_km) : undefined,
          });
          return;
        }
      }

      // 4. Check new direct courses assigned
      const { data: newCourses } = await supabase
        .from('courses')
        .select(`
          id, pickup_address, destination_address, scheduled_date, 
          guest_name, created_at,
          clients(profiles:user_id(full_name)),
          devis(amount)
        `)
        .eq('driver_id', driverId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (newCourses?.length) {
        const item = newCourses[0];
        const key = `direct-${item.id}`;
        const createdAt = new Date(item.created_at).getTime();
        const isNew = Date.now() - createdAt < 60000;
        
        if (isNew && !dismissed.has(key) && lastProcessedRef.current !== key) {
          lastProcessedRef.current = key;
          const clientName = (item.clients as any)?.profiles?.full_name || item.guest_name || null;
          setIncomingCourse({
            id: key,
            source: 'direct',
            sourceId: item.id,
            pickupAddress: item.pickup_address || '',
            destinationAddress: item.destination_address || '',
            scheduledDate: item.scheduled_date || '',
            amount: (item.devis as any)?.[0]?.amount || null,
            clientName,
            senderDriverName: null,
            commissionPercentage: null,
            expiresAt: null,
            priority: 3,
            receivedAt: Date.now(),
          });
        }
      }
    } catch (err) {
      console.error('[IncomingCourseListener] Error:', err);
    }
  }, [driverId, enabled, dismissed]);

  // Dismiss the current overlay
  const dismiss = useCallback(() => {
    if (incomingCourse) {
      setDismissed(prev => new Set(prev).add(incomingCourse.id));
      setIncomingCourse(null);
      lastProcessedRef.current = null;
    }
  }, [incomingCourse]);

  // Clear after action taken
  const clearCurrent = useCallback(() => {
    if (incomingCourse) {
      setDismissed(prev => new Set(prev).add(incomingCourse.id));
      setIncomingCourse(null);
      lastProcessedRef.current = null;
    }
  }, [incomingCourse]);

  // Initial check
  useEffect(() => {
    if (driverId && enabled) {
      checkForNewCourses();
    }
  }, [driverId, enabled, checkForNewCourses]);

  // Realtime subscriptions
  useEffect(() => {
    if (!driverId || !enabled) return;

    const cleanupQueue = subscriptionManager.subscribe(
      `incoming-queue-${driverId}`,
      { table: 'course_queue', event: 'INSERT', filter: `driver_id=eq.${driverId}`, debounceMs: 300 },
      () => checkForNewCourses()
    );

    const cleanupShared = subscriptionManager.subscribe(
      `incoming-shared-${driverId}`,
      { table: 'shared_courses', event: 'INSERT', filter: `receiver_driver_id=eq.${driverId}`, debounceMs: 300 },
      () => checkForNewCourses()
    );

    const cleanupCourses = subscriptionManager.subscribe(
      `incoming-direct-${driverId}`,
      { table: 'courses', event: 'INSERT', filter: `driver_id=eq.${driverId}`, debounceMs: 300 },
      () => checkForNewCourses()
    );

    const cleanupRideRequests = subscriptionManager.subscribe(
      `incoming-ride-requests-${driverId}`,
      { table: 'ride_requests', event: 'INSERT', filter: `selected_driver_id=eq.${driverId}`, debounceMs: 300 },
      () => checkForNewCourses()
    );

    return () => {
      cleanupQueue();
      cleanupShared();
      cleanupCourses();
      cleanupRideRequests();
    };
  }, [driverId, enabled, checkForNewCourses]);

  return {
    incomingCourse,
    dismiss,
    clearCurrent,
    refresh: checkForNewCourses,
  };
}
