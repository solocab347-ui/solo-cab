-- Fix get_course_sharing_status function - ORDER BY inside aggregate
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
  -- Get all shares for this course by this sender (fix: use subquery for ordering)
  SELECT jsonb_agg(share_data ORDER BY created_at DESC) INTO v_shares
  FROM (
    SELECT 
      jsonb_build_object(
        'id', sc.id,
        'status', sc.status,
        'sharing_mode', sc.sharing_mode,
        'receiver_driver_id', sc.receiver_driver_id,
        'receiver_name', p.full_name,
        'receiver_photo', p.profile_photo_url,
        'receiver_company', d.company_name,
        'receiver_code', d.driver_code,
        'commission_percentage', sc.commission_percentage,
        'created_at', sc.created_at,
        'accepted_at', sc.accepted_at,
        'started_at', sc.started_at,
        'completed_at', sc.completed_at,
        'cancelled_at', sc.cancelled_at
      ) as share_data,
      sc.created_at
    FROM shared_courses sc
    JOIN drivers d ON d.id = sc.receiver_driver_id
    JOIN profiles p ON p.id = d.user_id
    WHERE sc.course_id = p_course_id
      AND sc.sender_driver_id = p_driver_id
  ) sub;

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
        'created_at', sc.created_at,
        'receiver_name', p.full_name,
        'receiver_photo', p.profile_photo_url,
        'receiver_company', d.company_name
      ),
      'all_shares', v_shares
    ) INTO v_result
    FROM shared_courses sc
    JOIN drivers d ON d.id = sc.receiver_driver_id
    JOIN profiles p ON p.id = d.user_id
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