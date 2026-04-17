-- Fix: remove invalid enum value 'waiting_client' that crashes the cron job
CREATE OR REPLACE FUNCTION public.expire_timed_out_ride_requests()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer := 0;
  v_orphan_count integer := 0;
  v_driver_count integer := 0;
  v_stuck_courses integer := 0;
BEGIN
  -- 1. Expire pending requests past timeout
  UPDATE ride_requests 
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND timeout_at IS NOT NULL
    AND timeout_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 2. Expire orphaned accepted requests (accepted but no course created within 2 min)
  UPDATE ride_requests
  SET status = 'expired', updated_at = now()
  WHERE status = 'accepted'
    AND final_course_id IS NULL
    AND updated_at < now() - interval '2 minutes';
  GET DIAGNOSTICS v_orphan_count = ROW_COUNT;

  -- 3. Auto-cancel stuck active courses (>2h with no update) - prevents permanent blocking
  UPDATE courses
  SET status = 'cancelled'::course_status,
      cancellation_reason = COALESCE(cancellation_reason, 'Auto-déblocage : course inactive >2h'),
      cancelled_at = COALESCE(cancelled_at, now()),
      final_payment_locked_at = NULL,
      updated_at = now()
  WHERE status::text IN ('pending', 'accepted', 'driver_approaching', 'driver_arrived', 'in_progress')
    AND updated_at < now() - interval '2 hours';
  GET DIAGNOSTICS v_stuck_courses = ROW_COUNT;

  -- 4. Recover stuck drivers: marked busy but no active course (uses VALID enum values only)
  UPDATE drivers
  SET driver_status = 'online', is_available_now = true, updated_at = now()
  WHERE driver_status IN ('assigned', 'in_ride')
    AND id NOT IN (
      SELECT DISTINCT driver_id FROM courses
      WHERE status::text IN ('pending', 'accepted', 'driver_approaching', 'driver_arrived', 'in_progress')
        AND driver_id IS NOT NULL
    );
  GET DIAGNOSTICS v_driver_count = ROW_COUNT;

  RAISE LOG '[expire_timed_out_ride_requests] expired=%, orphans=%, stuck_courses=%, recovered_drivers=%', 
    v_count, v_orphan_count, v_stuck_courses, v_driver_count;
  
  RETURN v_count + v_orphan_count;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[expire_timed_out_ride_requests] ERROR: % %', SQLERRM, SQLSTATE;
  RETURN 0;
END;
$function$;

-- Audit any remaining function referencing the invalid enum
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN 
    SELECT proname FROM pg_proc 
    WHERE pronamespace = 'public'::regnamespace
      AND prosrc ILIKE '%waiting_client%'
  LOOP
    RAISE LOG '[AUDIT] Function still references waiting_client: %', r.proname;
  END LOOP;
END $$;