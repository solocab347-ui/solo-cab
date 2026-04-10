CREATE OR REPLACE FUNCTION public.get_guest_tracking_token(_course_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT guest_tracking_token
  FROM public.courses
  WHERE id = _course_id
    AND is_guest_booking = true
    AND guest_tracking_token IS NOT NULL
  LIMIT 1
$$;