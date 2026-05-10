import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subscriptionManager } from '@/lib/subscriptionManager';
import { realtimeHealthLogger } from '@/lib/realtimeHealthLogger';

export interface IncomingCourse {
  id: string;
  source: 'direct' | 'shared' | 'queue' | 'fleet' | 'ride_request';
  sourceId: string;
  rideId: string;
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
  paymentMethod?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  destinationLatitude?: number;
  destinationLongitude?: number;
}

interface UseIncomingCourseListenerOptions {
  driverId: string | null;
  enabled?: boolean;
}

export function useIncomingCourseListener({ driverId, enabled = true }: UseIncomingCourseListenerOptions) {
  const [incomingCourse, setIncomingCourse] = useState<IncomingCourse | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const queueRef = useRef<IncomingCourse[]>([]);
  const isShowingRef = useRef(false);

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

  const enqueue = useCallback((course: IncomingCourse) => {
    if (dismissed.has(course.id)) return;
    if (queueRef.current.some(c => c.id === course.id)) return;
    if (incomingCourse?.id === course.id) return;

    queueRef.current.push(course);
    if (!isShowingRef.current) showNext();
  }, [dismissed, incomingCourse, showNext]);

  const removeRide = useCallback((rideId: string) => {
    queueRef.current = queueRef.current.filter(c => c.rideId !== rideId);
    
    setIncomingCourse(prev => {
      if (prev && prev.rideId === rideId) {
        isShowingRef.current = false;
        setTimeout(() => showNext(), 200);
        return null;
      }
      return prev;
    });
  }, [showNext]);

  const checkForNewCourses = useCallback(async () => {
    if (!driverId || !enabled) return;

    const { data: driverData } = await supabase
      .from('drivers')
      .select('driver_status')
      .eq('id', driverId)
      .maybeSingle();
    
    const status = driverData?.driver_status;
    // Only block polling for explicit non-receptive statuses
    // 'assigned' is allowed because the driver could have multiple pending requests
    if (status && ['offline', 'break'].includes(status)) return;

    try {
      const nowIso = new Date().toISOString();
      const [queueResult, sharedResult, rideResult, directResult] = await Promise.all([
        supabase
          .from('course_queue')
          .select(`
            id, course_id, priority, expires_at,
            course:courses!course_queue_course_id_fkey(
              pickup_address, destination_address, scheduled_date,
              guest_name, distance_km, payment_method_requested,
              pickup_latitude, pickup_longitude, destination_latitude, destination_longitude,
              clients(profiles:user_id(full_name)),
              devis(amount)
            )
          `)
          .eq('driver_id', driverId)
          .eq('status', 'pending')
          .gt('expires_at', nowIso)
          .order('priority', { ascending: false })
          .limit(3),

        supabase
          .from('shared_courses')
          .select(`
            id, course_id, course_amount, commission_percentage, created_at,
            course:courses!shared_courses_course_id_fkey(
              pickup_address, destination_address, scheduled_date,
              distance_km, payment_method_requested,
              pickup_latitude, pickup_longitude, destination_latitude, destination_longitude
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
          .select('id, pickup_address, destination_address, estimated_price, timeout_at, created_at, request_type, driver_count, distance_km, guest_name, scheduled_date, payment_method, pickup_latitude, pickup_longitude, destination_latitude, destination_longitude')
          .eq('selected_driver_id', driverId)
          .eq('status', 'pending')
          .gt('timeout_at', nowIso)
          .order('created_at', { ascending: false })
          .limit(3),

        supabase
          .from('courses')
          .select(`
            id, pickup_address, destination_address, scheduled_date, 
            guest_name, created_at, distance_km, payment_method_requested,
            pickup_latitude, pickup_longitude, destination_latitude, destination_longitude,
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
          distanceKm: course?.distance_km ? Number(course.distance_km) : undefined,
          paymentMethod: course?.payment_method_requested || undefined,
          pickupLatitude: course?.pickup_latitude ? Number(course.pickup_latitude) : undefined,
          pickupLongitude: course?.pickup_longitude ? Number(course.pickup_longitude) : undefined,
          destinationLatitude: course?.destination_latitude ? Number(course.destination_latitude) : undefined,
          destinationLongitude: course?.destination_longitude ? Number(course.destination_longitude) : undefined,
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
          distanceKm: course?.distance_km ? Number(course.distance_km) : undefined,
          paymentMethod: course?.payment_method_requested || undefined,
          pickupLatitude: course?.pickup_latitude ? Number(course.pickup_latitude) : undefined,
          pickupLongitude: course?.pickup_longitude ? Number(course.pickup_longitude) : undefined,
          destinationLatitude: course?.destination_latitude ? Number(course.destination_latitude) : undefined,
          destinationLongitude: course?.destination_longitude ? Number(course.destination_longitude) : undefined,
        });
      });

      // Process ride requests
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
          paymentMethod: item.payment_method || undefined,
          pickupLatitude: item.pickup_latitude ? Number(item.pickup_latitude) : undefined,
          pickupLongitude: item.pickup_longitude ? Number(item.pickup_longitude) : undefined,
          destinationLatitude: item.destination_latitude ? Number(item.destination_latitude) : undefined,
          destinationLongitude: item.destination_longitude ? Number(item.destination_longitude) : undefined,
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
          distanceKm: item.distance_km ? Number(item.distance_km) : undefined,
          paymentMethod: item.payment_method_requested || undefined,
          pickupLatitude: item.pickup_latitude ? Number(item.pickup_latitude) : undefined,
          pickupLongitude: item.pickup_longitude ? Number(item.pickup_longitude) : undefined,
          destinationLatitude: item.destination_latitude ? Number(item.destination_latitude) : undefined,
          destinationLongitude: item.destination_longitude ? Number(item.destination_longitude) : undefined,
        });
      });
    } catch (err) {
      console.error('[IncomingCourseListener] Error:', err);
    }
  }, [driverId, enabled, dismissed, enqueue]);

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

  // Fallback polling + app resume recovery
  useEffect(() => {
    if (!driverId || !enabled) return;

    const interval = window.setInterval(() => {
      checkForNewCourses();
    }, 5000);

    const handleFocus = () => checkForNewCourses();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForNewCourses();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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

    const cleanupRideInsert = subscriptionManager.subscribe(
      `incoming-ride-requests-${driverId}`,
      { table: 'ride_requests', event: 'INSERT', filter: `selected_driver_id=eq.${driverId}`, debounceMs: 300 },
      () => checkForNewCourses()
    );

    const cleanupRideUpdate = subscriptionManager.subscribe(
      `ride-status-update-${driverId}`,
      { table: 'ride_requests', event: 'UPDATE', filter: `selected_driver_id=eq.${driverId}`, debounceMs: 100 },
      (payload: any) => {
        const newStatus = payload?.new?.status;
        const rideId = payload?.new?.id;
        if (rideId && newStatus && newStatus !== 'pending') {
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
