
DROP FUNCTION IF EXISTS public.guest_submit_rating(text, integer);

CREATE OR REPLACE FUNCTION public.guest_submit_rating(
  _token text, 
  _rating integer,
  _reason text DEFAULT NULL,
  _reason_detail text DEFAULT NULL
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
  _existing_rating_id uuid;
BEGIN
  -- Validate rating
  IF _rating < 1 OR _rating > 5 THEN
    RETURN false;
  END IF;

  -- Validate token format
  BEGIN
    _token_uuid := _token::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;

  -- Find the course
  SELECT id, client_id, driver_id, client_rating
  INTO _course
  FROM courses
  WHERE guest_tracking_token = _token_uuid
    AND is_guest_booking = true;

  IF _course.id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if already rated in course_ratings
  SELECT id INTO _existing_rating_id
  FROM course_ratings
  WHERE course_id = _course.id
  LIMIT 1;

  IF _existing_rating_id IS NOT NULL THEN
    RETURN false; -- Already rated
  END IF;

  -- Determine status: 4-5★ validated immediately, 1-3★ pending review
  IF _rating >= 4 THEN
    _rating_status := 'validated';
  ELSE
    _rating_status := 'pending_review';
  END IF;

  -- Insert into course_ratings (the real rating table)
  INSERT INTO course_ratings (
    course_id, client_id, driver_id, rating, 
    reason, reason_detail, status, 
    client_response_deadline
  ) VALUES (
    _course.id, 
    _course.client_id, 
    _course.driver_id, 
    _rating,
    CASE WHEN _rating <= 3 THEN _reason ELSE NULL END,
    CASE WHEN _rating <= 3 THEN _reason_detail ELSE NULL END,
    _rating_status,
    CASE WHEN _rating <= 3 THEN now() + interval '24 hours' ELSE NULL END
  );

  -- Update legacy client_rating on courses (only for validated ratings)
  IF _rating_status = 'validated' THEN
    UPDATE courses 
    SET client_rating = _rating, updated_at = now()
    WHERE id = _course.id;
  ELSE
    -- For pending_review, still store it so the UI knows a rating was given
    UPDATE courses 
    SET client_rating = _rating, updated_at = now()
    WHERE id = _course.id;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_submit_rating(text, integer, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.guest_submit_rating(text, integer, text, text) TO authenticated;
