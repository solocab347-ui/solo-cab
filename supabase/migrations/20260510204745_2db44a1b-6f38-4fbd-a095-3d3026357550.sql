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
DECLARE
  v_status text;
BEGIN
  IF p_latitude IS NULL
     OR p_longitude IS NULL
     OR p_latitude < -90
     OR p_latitude > 90
     OR p_longitude < -180
     OR p_longitude > 180
     OR (p_latitude = 0 AND p_longitude = 0) THEN
    RAISE EXCEPTION 'Invalid GPS coordinates';
  END IF;

  SELECT d.driver_status
    INTO v_status
  FROM public.drivers d
  WHERE d.id = p_driver_id
    AND d.user_id = auth.uid()
  LIMIT 1;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Never let a late native GPS callback resurrect an offline / break driver.
  IF v_status NOT IN ('online', 'assigned', 'in_ride') THEN
    RETURN;
  END IF;

  UPDATE public.drivers
  SET
    current_latitude = p_latitude,
    current_longitude = p_longitude,
    last_location_update = now(),
    last_seen_at = now(),
    updated_at = now()
  WHERE id = p_driver_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_driver_location_batch(uuid, double precision, double precision, double precision) FROM public;
GRANT EXECUTE ON FUNCTION public.update_driver_location_batch(uuid, double precision, double precision, double precision) TO authenticated;

UPDATE public.drivers
SET
  is_available_now = false,
  current_latitude = NULL,
  current_longitude = NULL,
  last_location_update = NULL,
  updated_at = now()
WHERE driver_status NOT IN ('online', 'assigned', 'in_ride')
  AND (
    is_available_now IS DISTINCT FROM false
    OR current_latitude IS NOT NULL
    OR current_longitude IS NOT NULL
    OR last_location_update IS NOT NULL
  );