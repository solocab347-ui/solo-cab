import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscriptionManager } from '@/lib/subscriptionManager';

export interface IncomingCourse {
  id: string;
  source: 'direct' | 'shared' | 'queue' | 'fleet' | 'ride_request';
  sourceId: string;
  rideId: string; // Always the real DB row id for traceability
  pickupAddress: string;
  destinationAddress: string;
  scheduledDate: string;
  amount: number | null;
  clientName: string | null;
  senderDriverName: string | null;
  commissionPercentage: number | null;
  expiresAt: string | null;
  priority: number;
  receivedAt: number;
  requestType?: 'exclusive' | 'multi';
  driverCount?: number;
  distanceKm?: number;
}

interface UseIncomingCourseListenerOptions {
  driverId: string | null;
  enabled?: boolean;
}

/**
 * Listener for incoming courses — fully isolated per driver.
 * 
 * ISOLATION RULES:
 * 1. ALL queries filter by driver_id on the backend
 * 2. Realtime subscriptions filter by driver_id
 * 3. UPDATE events (accepted/expired) auto-dismiss popups
 * 4. Each overlay carries the ride_id for traceability
 */
export function useIncomingCourseListener({ driverId, enabled = true }: UseIncomingCourseListenerOptions) {
  const [incomingCourse, setIncomingCourse] = useState<IncomingCourse | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const queueRef = useRef<IncomingCourse[]>([]);
  const isShowingRef = useRef(false);

  // Show next course from queue
  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      isShowingRef.current = false;
      return;
    }
    queueRef.current.sort((a, b) => b.priority - a.priority);
    const next = queueRef.current.shift()!;
    isShowingRef.current = true;
    requestAnimationFrame(() => setIncomingCourse(next));
  }, []);

  // Enqueue a course (deduplicates)
  const enqueue = useCallback((course: IncomingCourse) => {
    if (dismissed.has(course.id)) return;
    if (queueRef.current.some(c => c.id === course.id)) return;
    if (incomingCourse?.id === course.id) return;

    queueRef.current.push(course);
    if (!isShowingRef.current) showNext();
  }, [dismissed, incomingCourse, showNext]);

  // Remove a ride from queue + dismiss if currently showing
  const removeRide = useCallback((rideId: string) => {
    // Remove from queue
    queueRef.current = queueRef.current.filter(c => c.rideId !== rideId);
    
    // If currently showing this ride, dismiss it
    setIncomingCourse(prev => {
      if (prev && prev.rideId === rideId) {
        isShowingRef.current = false;
        setTimeout(() => showNext(), 200);
        return null;
      }
      return prev;
    });
  }, [showNext]);

  // Fetch pending courses — ALL filtered by driver_id server-side
  // Only check if driver is in a state that can receive courses
  const checkForNewCourses = useCallback(async () => {
    if (!driverId || !enabled) return;

    // Check driver_status first — only online_available drivers should receive courses
    const { data: driverData } = await supabase
      .from('drivers')
      .select('driver_status')
      .eq('id', driverId)
      .maybeSingle();
    
    const status = driverData?.driver_status;
    if (status && status !== 'online_available') {
      // Driver is accepting, on_trip, reserved, or offline — don't show new courses
      return;
    }

    try {
      const [queueResult, sharedResult, rideResult, directResult] = await Promise.all([
        supabase
          .from('course_queue')
          .select(`
            id, course_id, priority, expires_at,
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
          .limit(3),

        supabase
          .from('shared_courses')
          .select(`
            id, course_id, course_amount, commission_percentage, created_at,
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
          .limit(3),

        supabase
          .from('ride_requests')
          .select('id, pickup_address, destination_address, estimated_price, timeout_at, created_at, request_type, driver_count, distance_km, guest_name, scheduled_date')
          .eq('selected_driver_id', driverId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(3),

        supabase
          .from('courses')
          .select(`
            id, pickup_address, destination_address, scheduled_date, 
            guest_name, created_at,
            clients(profiles:user_id(full_name)),
            devis(amount)
          `)
          .eq('driver_id', driverId)
          .eq('status', 'pending')
          .gt('created_at', new Date(Date.now() - 60000).toISOString())
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      // Process queue items
      queueResult.data?.forEach(item => {
        const key = `queue-${item.id}`;
        if (dismissed.has(key)) return;
        const course = item.course as any;
        enqueue({
          id: key,
          source: 'queue',
          sourceId: item.id,
          rideId: item.id,
          pickupAddress: course?.pickup_address || '',
          destinationAddress: course?.destination_address || '',
          scheduledDate: course?.scheduled_date || '',
          amount: course?.devis?.[0]?.amount || null,
          clientName: course?.clients?.profiles?.full_name || course?.guest_name || null,
          senderDriverName: null,
          commissionPercentage: null,
          expiresAt: item.expires_at,
          priority: item.priority || 1,
          receivedAt: Date.now(),
        });
      });

      // Process shared items
      sharedResult.data?.forEach(item => {
        const key = `shared-${item.id}`;
        if (dismissed.has(key)) return;
        const course = item.course as any;
        const sender = item.sender_driver as any;
        enqueue({
          id: key,
          source: 'shared',
          sourceId: item.id,
          rideId: item.id,
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
      });

      // Process ride requests — STRICTLY filtered by selected_driver_id
      rideResult.data?.forEach(item => {
        const key = `ride_request-${item.id}`;
        if (dismissed.has(key)) return;
        enqueue({
          id: key,
          source: 'ride_request',
          sourceId: item.id,
          rideId: item.id,
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
      });

      // Process direct courses
      directResult.data?.forEach(item => {
        const key = `direct-${item.id}`;
        if (dismissed.has(key)) return;
        const clientName = (item.clients as any)?.profiles?.full_name || item.guest_name || null;
        enqueue({
          id: key,
          source: 'direct',
          sourceId: item.id,
          rideId: item.id,
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
      });
    } catch (err) {
      console.error('[IncomingCourseListener] Error:', err);
    }
  }, [driverId, enabled, dismissed, enqueue]);

  // Dismiss current and show next
  const dismiss = useCallback(() => {
    if (incomingCourse) {
      setDismissed(prev => new Set(prev).add(incomingCourse.id));
      setIncomingCourse(null);
      isShowingRef.current = false;
      setTimeout(() => showNext(), 300);
    }
  }, [incomingCourse, showNext]);

  const clearCurrent = useCallback(() => {
    if (incomingCourse) {
      setDismissed(prev => new Set(prev).add(incomingCourse.id));
      setIncomingCourse(null);
      isShowingRef.current = false;
      setTimeout(() => showNext(), 300);
    }
  }, [incomingCourse, showNext]);

  // Initial check
  useEffect(() => {
    if (driverId && enabled) checkForNewCourses();
  }, [driverId, enabled, checkForNewCourses]);

  // Realtime subscriptions — ALL filtered by driver_id (backend isolation)
  useEffect(() => {
    if (!driverId || !enabled) return;

    // INSERT listeners — new courses targeting this driver only
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

    const cleanupRideInsert = subscriptionManager.subscribe(
      `incoming-ride-requests-${driverId}`,
      { table: 'ride_requests', event: 'INSERT', filter: `selected_driver_id=eq.${driverId}`, debounceMs: 300 },
      () => checkForNewCourses()
    );

    // UPDATE listener — auto-dismiss when ride_request changes status (accepted by another, expired)
    const cleanupRideUpdate = subscriptionManager.subscribe(
      `ride-status-update-${driverId}`,
      { table: 'ride_requests', event: 'UPDATE', filter: `selected_driver_id=eq.${driverId}`, debounceMs: 100 },
      (payload: any) => {
        const newStatus = payload?.new?.status;
        const rideId = payload?.new?.id;
        if (rideId && newStatus && newStatus !== 'pending') {
          // This ride is no longer available — remove from queue/overlay immediately
          removeRide(rideId);
        }
      }
    );

    return () => {
      cleanupQueue();
      cleanupShared();
      cleanupCourses();
      cleanupRideInsert();
      cleanupRideUpdate();
    };
  }, [driverId, enabled, checkForNewCourses, removeRide]);

  return {
    incomingCourse,
    dismiss,
    clearCurrent,
    refresh: checkForNewCourses,
  };
}
