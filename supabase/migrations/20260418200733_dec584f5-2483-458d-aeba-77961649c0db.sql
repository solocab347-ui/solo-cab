CREATE INDEX IF NOT EXISTS idx_ride_requests_pending_driver_created
  ON public.ride_requests (selected_driver_id, status, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ride_requests_group_status
  ON public.ride_requests (request_group_id, status)
  WHERE request_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_driver_active_status
  ON public.courses (driver_id, status, created_at DESC)
  WHERE status IN ('driver_approaching', 'driver_arrived', 'in_progress', 'accepted', 'pending');

CREATE INDEX IF NOT EXISTS idx_drivers_gps_recent
  ON public.drivers (last_location_update DESC)
  WHERE current_latitude IS NOT NULL AND current_longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_drivers_available_now
  ON public.drivers (is_available_now, driver_status)
  WHERE is_available_now = true;

CREATE OR REPLACE FUNCTION public.update_driver_location_batch(
  p_driver_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.drivers
    WHERE id = p_driver_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.drivers
  SET
    current_latitude = p_latitude,
    current_longitude = p_longitude,
    last_location_update = now(),
    last_seen_at = now()
  WHERE id = p_driver_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_driver_location_batch(uuid, double precision, double precision, double precision) TO authenticated;