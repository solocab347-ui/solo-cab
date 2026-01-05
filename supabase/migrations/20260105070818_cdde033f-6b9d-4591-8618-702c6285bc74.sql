-- Drop and recreate claim_pool_course function with fixed variables
DROP FUNCTION IF EXISTS claim_pool_course(UUID, UUID);

CREATE OR REPLACE FUNCTION claim_pool_course(
  p_shared_course_id UUID,
  p_claimer_driver_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_shared_course shared_courses%ROWTYPE;
  v_sender_user_id UUID;
  v_claimer_name TEXT;
  v_pickup_address TEXT;
  v_scheduled_date TIMESTAMPTZ;
BEGIN
  -- Lock the shared course row to prevent race conditions
  SELECT * INTO v_shared_course
  FROM shared_courses
  WHERE id = p_shared_course_id
  FOR UPDATE NOWAIT;
  
  -- Check if course exists
  IF v_shared_course.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Course non trouvée');
  END IF;
  
  -- Check if it's a pool course
  IF v_shared_course.share_mode != 'pool' THEN
    RETURN json_build_object('success', false, 'error', 'Cette course n''est pas en mode pool');
  END IF;
  
  -- Check if already claimed
  IF v_shared_course.receiver_driver_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Cette course a déjà été réclamée');
  END IF;
  
  -- Check if claimer is not the sender
  IF v_shared_course.sender_driver_id = p_claimer_driver_id THEN
    RETURN json_build_object('success', false, 'error', 'Vous ne pouvez pas réclamer votre propre course');
  END IF;
  
  -- Verify partnership exists
  IF NOT EXISTS (
    SELECT 1 FROM driver_partnerships
    WHERE status = 'active'
    AND (
      (driver_a_id = v_shared_course.sender_driver_id AND driver_b_id = p_claimer_driver_id)
      OR (driver_b_id = v_shared_course.sender_driver_id AND driver_a_id = p_claimer_driver_id)
    )
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Vous n''êtes pas partenaire avec ce chauffeur');
  END IF;
  
  -- Claim the course
  UPDATE shared_courses
  SET 
    receiver_driver_id = p_claimer_driver_id,
    status = 'accepted',
    accepted_at = NOW(),
    receiver_notified_at = NOW(),
    updated_at = NOW()
  WHERE id = p_shared_course_id;
  
  -- Get sender user_id for notification
  SELECT user_id INTO v_sender_user_id
  FROM drivers WHERE id = v_shared_course.sender_driver_id;
  
  -- Get claimer name
  SELECT SPLIT_PART(full_name, ' ', 1) INTO v_claimer_name
  FROM profiles p
  JOIN drivers d ON d.user_id = p.id
  WHERE d.id = p_claimer_driver_id;
  
  -- Get course info into separate variables (avoid RECORD not assigned error)
  SELECT pickup_address, scheduled_date
  INTO v_pickup_address, v_scheduled_date
  FROM courses
  WHERE id = v_shared_course.course_id;
  
  -- Notify sender that course was claimed
  IF v_sender_user_id IS NOT NULL AND v_pickup_address IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_sender_user_id,
      '✅ Course pool réclamée',
      COALESCE(v_claimer_name, 'Un partenaire') || ' a pris votre course du ' || 
      TO_CHAR(v_scheduled_date, 'DD/MM/YYYY à HH24:MI'),
      'success',
      '/driver-dashboard?tab=partnerships&subtab=sent'
    );
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'Course réclamée avec succès');
  
EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object('success', false, 'error', 'Cette course est en cours de traitement, veuillez réessayer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;