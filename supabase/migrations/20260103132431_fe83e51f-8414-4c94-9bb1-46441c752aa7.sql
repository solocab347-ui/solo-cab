-- Add sharing_mode to track if shared to single partner or pool
ALTER TABLE public.shared_courses 
ADD COLUMN IF NOT EXISTS sharing_mode text DEFAULT 'single' CHECK (sharing_mode IN ('single', 'pool'));

-- Add pool_group_id to group courses shared to all partners together
ALTER TABLE public.shared_courses 
ADD COLUMN IF NOT EXISTS pool_group_id uuid;

-- Add cancelled tracking
ALTER TABLE public.shared_courses 
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

ALTER TABLE public.shared_courses 
ADD COLUMN IF NOT EXISTS cancelled_by uuid;

-- Add claimed tracking for pool mode
ALTER TABLE public.shared_courses 
ADD COLUMN IF NOT EXISTS claimed_at timestamp with time zone;

ALTER TABLE public.shared_courses 
ADD COLUMN IF NOT EXISTS claimed_by uuid;

-- Function to check if a course is currently shared and locked
CREATE OR REPLACE FUNCTION public.is_course_shared_locked(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_shared_course record;
BEGIN
  -- Check if there's an active share (pending, accepted, in_progress)
  SELECT 
    sc.id,
    sc.status,
    sc.sharing_mode,
    sc.receiver_driver_id,
    sc.created_at,
    sc.accepted_at,
    d.user_id as receiver_user_id
  INTO v_shared_course
  FROM shared_courses sc
  LEFT JOIN drivers d ON d.id = sc.receiver_driver_id
  WHERE sc.course_id = p_course_id
    AND sc.status IN ('pending', 'accepted', 'in_progress')
    AND sc.cancelled_at IS NULL
  ORDER BY sc.created_at DESC
  LIMIT 1;

  IF v_shared_course IS NULL THEN
    RETURN jsonb_build_object('is_locked', false);
  END IF;

  -- Get receiver info
  SELECT jsonb_build_object(
    'is_locked', true,
    'shared_course_id', v_shared_course.id,
    'status', v_shared_course.status,
    'sharing_mode', v_shared_course.sharing_mode,
    'receiver_driver_id', v_shared_course.receiver_driver_id,
    'created_at', v_shared_course.created_at,
    'accepted_at', v_shared_course.accepted_at,
    'receiver_name', p.full_name,
    'receiver_photo', p.profile_photo_url
  ) INTO v_result
  FROM profiles p
  WHERE p.id = v_shared_course.receiver_user_id;

  RETURN COALESCE(v_result, jsonb_build_object('is_locked', true, 'status', v_shared_course.status));
END;
$$;

-- Function to cancel a shared course and unlock it
CREATE OR REPLACE FUNCTION public.cancel_shared_course(p_shared_course_id uuid, p_driver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shared_course record;
  v_pool_group_id uuid;
BEGIN
  -- Get shared course with locking
  SELECT * INTO v_shared_course
  FROM shared_courses
  WHERE id = p_shared_course_id
  FOR UPDATE NOWAIT;

  IF v_shared_course IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Course partagée non trouvée');
  END IF;

  -- Check if sender is the one cancelling
  IF v_shared_course.sender_driver_id != p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vous ne pouvez annuler que vos propres partages');
  END IF;

  -- Check status - can only cancel pending shares
  IF v_shared_course.status NOT IN ('pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cette course a déjà été acceptée ou terminée');
  END IF;

  v_pool_group_id := v_shared_course.pool_group_id;

  -- If it's a pool share, cancel all pending shares in the group
  IF v_pool_group_id IS NOT NULL THEN
    UPDATE shared_courses
    SET 
      cancelled_at = now(),
      cancelled_by = p_driver_id,
      status = 'cancelled'
    WHERE pool_group_id = v_pool_group_id
      AND status = 'pending';
  ELSE
    -- Cancel just this one
    UPDATE shared_courses
    SET 
      cancelled_at = now(),
      cancelled_by = p_driver_id,
      status = 'cancelled'
    WHERE id = p_shared_course_id;
  END IF;

  -- Notify receiver that share was cancelled
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT 
    d.user_id,
    '❌ Partage annulé',
    'Le chauffeur a annulé le partage de la course',
    'warning',
    '/driver-dashboard'
  FROM drivers d
  WHERE d.id = v_shared_course.receiver_driver_id;

  RETURN jsonb_build_object('success', true, 'message', 'Partage annulé avec succès');

EXCEPTION 
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'Opération en cours, réessayez');
END;
$$;

-- Function for atomic claiming of pooled course (first come first served)
CREATE OR REPLACE FUNCTION public.claim_pool_course(p_pool_group_id uuid, p_receiver_driver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shared_course record;
  v_other_count int;
  v_course_info record;
BEGIN
  -- Try to get exclusive lock on a pending course for this receiver in this pool
  SELECT * INTO v_shared_course
  FROM shared_courses
  WHERE pool_group_id = p_pool_group_id
    AND receiver_driver_id = p_receiver_driver_id
    AND status = 'pending'
    AND cancelled_at IS NULL
  FOR UPDATE NOWAIT;

  IF v_shared_course IS NULL THEN
    -- Check if another partner already claimed it
    SELECT COUNT(*) INTO v_other_count
    FROM shared_courses
    WHERE pool_group_id = p_pool_group_id
      AND status = 'accepted';
    
    IF v_other_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Cette course a déjà été récupérée par un autre partenaire');
    END IF;
    
    RETURN jsonb_build_object('success', false, 'error', 'Course non disponible');
  END IF;

  -- Claim this course - mark as accepted
  UPDATE shared_courses
  SET 
    status = 'accepted',
    accepted_at = now(),
    claimed_at = now(),
    claimed_by = p_receiver_driver_id
  WHERE id = v_shared_course.id;

  -- Mark all other pending shares in this pool as expired
  UPDATE shared_courses
  SET 
    status = 'expired',
    cancelled_at = now()
  WHERE pool_group_id = p_pool_group_id
    AND id != v_shared_course.id
    AND status = 'pending';

  -- Get course info for notification
  SELECT pickup_address, scheduled_date INTO v_course_info
  FROM courses
  WHERE id = v_shared_course.course_id;

  -- Notify sender that course was claimed
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT 
    d.user_id,
    '✅ Course récupérée',
    (SELECT full_name FROM profiles WHERE id = (SELECT user_id FROM drivers WHERE id = p_receiver_driver_id)) || ' a récupéré votre course',
    'success',
    '/driver-dashboard'
  FROM drivers d
  WHERE d.id = v_shared_course.sender_driver_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Course récupérée avec succès',
    'shared_course_id', v_shared_course.id
  );

EXCEPTION 
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'Course en cours de récupération par un autre partenaire');
END;
$$;

-- Function to get sharing status for a course (for original driver)
CREATE OR REPLACE FUNCTION public.get_course_sharing_status(p_course_id uuid, p_driver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_shares jsonb;
BEGIN
  -- Get all shares for this course by this sender
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', sc.id,
      'status', sc.status,
      'sharing_mode', sc.sharing_mode,
      'receiver_driver_id', sc.receiver_driver_id,
      'receiver_name', p.full_name,
      'receiver_photo', p.profile_photo_url,
      'receiver_company', d.company_name,
      'commission_percentage', sc.commission_percentage,
      'created_at', sc.created_at,
      'accepted_at', sc.accepted_at,
      'started_at', sc.started_at,
      'completed_at', sc.completed_at,
      'cancelled_at', sc.cancelled_at
    )
  ) INTO v_shares
  FROM shared_courses sc
  JOIN drivers d ON d.id = sc.receiver_driver_id
  JOIN profiles p ON p.id = d.user_id
  WHERE sc.course_id = p_course_id
    AND sc.sender_driver_id = p_driver_id
  ORDER BY sc.created_at DESC;

  -- Find active share (accepted or in_progress)
  SELECT jsonb_build_object(
    'has_sharing', true,
    'active_share', jsonb_build_object(
      'id', sc.id,
      'status', sc.status,
      'receiver_name', p.full_name,
      'receiver_photo', p.profile_photo_url,
      'receiver_company', d.company_name,
      'receiver_code', d.driver_code,
      'accepted_at', sc.accepted_at,
      'started_at', sc.started_at
    ),
    'all_shares', v_shares
  ) INTO v_result
  FROM shared_courses sc
  JOIN drivers d ON d.id = sc.receiver_driver_id
  JOIN profiles p ON p.id = d.user_id
  WHERE sc.course_id = p_course_id
    AND sc.sender_driver_id = p_driver_id
    AND sc.status IN ('accepted', 'in_progress')
    AND sc.cancelled_at IS NULL
  ORDER BY sc.accepted_at DESC
  LIMIT 1;

  -- If no active share, check for pending
  IF v_result IS NULL THEN
    SELECT jsonb_build_object(
      'has_sharing', true,
      'pending_share', jsonb_build_object(
        'id', sc.id,
        'status', 'pending',
        'sharing_mode', sc.sharing_mode,
        'pending_count', (SELECT COUNT(*) FROM shared_courses WHERE course_id = p_course_id AND status = 'pending' AND cancelled_at IS NULL),
        'created_at', sc.created_at
      ),
      'all_shares', v_shares
    ) INTO v_result
    FROM shared_courses sc
    WHERE sc.course_id = p_course_id
      AND sc.sender_driver_id = p_driver_id
      AND sc.status = 'pending'
      AND sc.cancelled_at IS NULL
    ORDER BY sc.created_at DESC
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_result, jsonb_build_object('has_sharing', false, 'all_shares', v_shares));
END;
$$;

-- Add status 'cancelled' and 'expired' to shared_courses check if not exists
-- (Done via application logic, status column is text)