
-- RPC to get payment info for a guest course
CREATE OR REPLACE FUNCTION public.get_guest_course_payment_info(_token text)
RETURNS TABLE (
  driver_id uuid,
  payment_status text,
  facture_payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_uuid uuid;
BEGIN
  BEGIN
    _token_uuid := _token::uuid;
  EXCEPTION WHEN others THEN
    RETURN;
  END;

  RETURN QUERY
  SELECT 
    c.driver_id,
    c.payment_status,
    f.payment_status as facture_payment_status
  FROM courses c
  LEFT JOIN factures f ON f.course_id = c.id
  WHERE c.guest_tracking_token = _token_uuid
    AND c.is_guest_booking = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_course_payment_info(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_guest_course_payment_info(text) TO authenticated;

-- RPC to submit a guest rating
CREATE OR REPLACE FUNCTION public.guest_submit_rating(_token text, _rating integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_uuid uuid;
  _course_id uuid;
BEGIN
  -- Validate rating
  IF _rating < 1 OR _rating > 5 THEN
    RETURN false;
  END IF;

  BEGIN
    _token_uuid := _token::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  -- Find the course and update rating only if not already rated
  UPDATE courses 
  SET client_rating = _rating, updated_at = now()
  WHERE guest_tracking_token = _token_uuid
    AND is_guest_booking = true
    AND (client_rating IS NULL OR client_rating = 0)
  RETURNING id INTO _course_id;

  RETURN _course_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_submit_rating(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.guest_submit_rating(text, integer) TO authenticated;
