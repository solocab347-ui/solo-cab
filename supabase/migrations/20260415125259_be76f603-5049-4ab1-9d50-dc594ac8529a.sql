ALTER TABLE public.course_ratings
ALTER COLUMN client_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS course_ratings_guest_one_per_course_idx
ON public.course_ratings (course_id)
WHERE client_id IS NULL;

CREATE OR REPLACE FUNCTION public.guest_submit_rating(
  _token text,
  _rating integer,
  _reason text DEFAULT NULL::text,
  _reason_detail text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_uuid uuid;
  _course record;
  _rating_status text;
  _already_rated boolean;
BEGIN
  IF _rating < 1 OR _rating > 5 THEN
    RETURN false;
  END IF;

  BEGIN
    _token_uuid := _token::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  SELECT id, client_id, driver_id, client_rating
  INTO _course
  FROM public.courses
  WHERE guest_tracking_token = _token_uuid
    AND is_guest_booking = true
  LIMIT 1;

  IF _course.id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.course_ratings
    WHERE course_id = _course.id
  ) INTO _already_rated;

  IF _already_rated OR COALESCE(_course.client_rating, 0) > 0 THEN
    RETURN false;
  END IF;

  _rating_status := CASE
    WHEN _rating >= 4 THEN 'validated'
    ELSE 'pending_review'
  END;

  INSERT INTO public.course_ratings (
    course_id,
    client_id,
    driver_id,
    rating,
    reason,
    reason_detail,
    status,
    client_response_deadline
  ) VALUES (
    _course.id,
    _course.client_id,
    _course.driver_id,
    _rating,
    CASE WHEN _rating <= 3 THEN _reason ELSE NULL END,
    CASE WHEN _rating <= 3 THEN NULLIF(trim(_reason_detail), '') ELSE NULL END,
    _rating_status,
    CASE WHEN _rating <= 3 THEN now() + interval '24 hours' ELSE NULL END
  );

  UPDATE public.courses
  SET client_rating = _rating,
      updated_at = now()
  WHERE id = _course.id;

  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_submit_rating(text, integer, text, text) TO anon, authenticated;