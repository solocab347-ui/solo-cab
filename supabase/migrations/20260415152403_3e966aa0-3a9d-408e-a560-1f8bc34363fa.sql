
-- Enhanced expire function: handles orphaned accepted requests + stuck drivers
CREATE OR REPLACE FUNCTION public.expire_timed_out_ride_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_orphan_count integer := 0;
  v_driver_count integer := 0;
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

  -- 3. Recover stuck drivers: assigned but no active course
  UPDATE drivers
  SET driver_status = 'online', is_available_now = true
  WHERE driver_status = 'assigned'
    AND id NOT IN (
      SELECT DISTINCT driver_id FROM courses
      WHERE status IN ('driver_approaching', 'in_progress', 'waiting_client')
        AND driver_id IS NOT NULL
    );
  GET DIAGNOSTICS v_driver_count = ROW_COUNT;

  RAISE LOG '[expire_timed_out_ride_requests] expired=%, orphans=%, stuck_drivers=%', v_count, v_orphan_count, v_driver_count;
  
  RETURN v_count + v_orphan_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_timed_out_ride_requests() TO service_role;
