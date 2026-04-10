-- Index for idempotency checks on finalize-course-payment
CREATE INDEX IF NOT EXISTS idx_courses_final_payment_status 
ON public.courses (final_payment_status) 
WHERE final_payment_status IS NOT NULL;

-- Composite index for atomic_accept_ride_request RPC performance
CREATE INDEX IF NOT EXISTS idx_ride_requests_accept_lookup 
ON public.ride_requests (id, selected_driver_id, status);

-- Prevent double payment for same course (unique per course + payment type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_course_type 
ON public.payments (course_id, payment_type) 
WHERE status IN ('succeeded', 'captured') AND course_id IS NOT NULL;

-- Atomic course finalization lock to prevent race conditions
CREATE OR REPLACE FUNCTION public.atomic_start_course_finalization(p_course_id uuid, p_driver_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course record;
BEGIN
  -- Lock the course row to prevent concurrent finalization
  SELECT c.id, c.final_payment_status, c.payment_status, c.payment_captured_at,
         c.status, d.user_id as driver_user_id
  INTO v_course
  FROM courses c
  JOIN drivers d ON d.id = c.driver_id
  WHERE c.id = p_course_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Course non trouvée');
  END IF;

  -- Verify caller is the driver
  IF v_course.driver_user_id != p_driver_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non autorisé');
  END IF;

  -- Idempotency: already finalized
  IF v_course.final_payment_status = 'succeeded' THEN
    RETURN jsonb_build_object('success', true, 'already_done', true, 'status', 'succeeded');
  END IF;

  -- Already captured by webhook
  IF v_course.payment_status = 'paid' AND v_course.payment_captured_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_done', true, 'status', 'already_captured');
  END IF;

  -- Already being processed
  IF v_course.final_payment_status = 'processing' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Paiement déjà en cours de traitement', 'status', 'processing');
  END IF;

  -- Atomically set to processing
  UPDATE courses 
  SET final_payment_status = 'processing',
      course_finalized_by_driver_at = now()
  WHERE id = p_course_id;

  RETURN jsonb_build_object('success', true, 'can_proceed', true);

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'Finalisation en cours par un autre processus', 'locked', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.atomic_start_course_finalization(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_start_course_finalization(uuid, uuid) TO service_role;