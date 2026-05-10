CREATE OR REPLACE FUNCTION public.set_driver_availability_atomic(
  _driver_id uuid,
  _target text
)
RETURNS TABLE(
  driver_status text,
  is_available_now boolean,
  blocked boolean,
  blocked_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
  v_owner uuid;
  v_active_course_id uuid;
  v_new_status text;
  v_available boolean;
BEGIN
  SELECT d.driver_status, d.user_id
    INTO v_current_status, v_owner
  FROM public.drivers d
  WHERE d.id = _driver_id
  LIMIT 1;

  IF v_owner IS NULL THEN
    RETURN QUERY SELECT
      COALESCE(v_current_status, 'offline')::text,
      false,
      true,
      'driver_not_found'::text;
    RETURN;
  END IF;

  IF v_owner <> auth.uid() THEN
    RETURN QUERY SELECT
      v_current_status::text,
      false,
      true,
      'forbidden'::text;
    RETURN;
  END IF;

  IF v_current_status IN ('assigned', 'in_ride') THEN
    SELECT c.id
      INTO v_active_course_id
    FROM public.courses c
    WHERE c.driver_id = _driver_id
      AND c.status::text IN ('pending', 'accepted', 'driver_approaching', 'driver_arrived', 'in_progress')
    ORDER BY c.updated_at DESC
    LIMIT 1;

    IF v_active_course_id IS NOT NULL THEN
      RETURN QUERY SELECT
        v_current_status::text,
        false,
        true,
        'driver_busy'::text;
      RETURN;
    END IF;
  END IF;

  IF _target = 'online' THEN
    v_new_status := 'online';
    v_available := true;
  ELSIF _target = 'break' THEN
    v_new_status := 'break';
    v_available := false;
  ELSE
    v_new_status := 'offline';
    v_available := false;
  END IF;

  IF v_available THEN
    UPDATE public.drivers
       SET driver_status = v_new_status,
           is_available_now = true,
           updated_at = now()
     WHERE id = _driver_id;
  ELSE
    UPDATE public.drivers
       SET driver_status = v_new_status,
           is_available_now = false,
           current_latitude = null,
           current_longitude = null,
           last_location_update = null,
           updated_at = now()
     WHERE id = _driver_id;
  END IF;

  RETURN QUERY SELECT
    v_new_status::text,
    v_available,
    false,
    null::text;
END;
$$;

REVOKE ALL ON FUNCTION public.set_driver_availability_atomic(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_driver_availability_atomic(uuid, text) TO authenticated;