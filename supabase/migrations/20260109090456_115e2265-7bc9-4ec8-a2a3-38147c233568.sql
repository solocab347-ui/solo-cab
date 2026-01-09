-- Fix auto_dispatch_fleet_course to use correct notifications schema
CREATE OR REPLACE FUNCTION public.auto_dispatch_fleet_course(p_course_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, assigned_driver_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course RECORD;
  v_next_driver_id UUID;
  v_driver_name TEXT;
  v_driver_user_id UUID;
  v_fm_user_id UUID;
BEGIN
  -- Get course details
  SELECT c.*, fm.user_id as fm_user_id
  INTO v_course
  FROM courses c
  JOIN fleet_managers fm ON fm.id = c.fleet_manager_id
  WHERE c.id = p_course_id;
  
  IF v_course IS NULL THEN
    RETURN QUERY SELECT false, 'Course not found'::text, NULL::uuid;
    RETURN;
  END IF;
  
  IF v_course.fleet_manager_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not a fleet manager course'::text, NULL::uuid;
    RETURN;
  END IF;
  
  IF v_course.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Course is not pending'::text, NULL::uuid;
    RETURN;
  END IF;
  
  v_fm_user_id := v_course.fm_user_id;
  
  -- Try to find next available partner (excluding those who already refused)
  SELECT find_nearest_available_fleet_partner(
    v_course.fleet_manager_id,
    v_course.pickup_latitude,
    v_course.pickup_longitude,
    v_course.scheduled_date,
    COALESCE(v_course.duration_minutes, 60),
    NULL, -- no favorite priority in auto-dispatch
    p_course_id -- pass course_id for exclusions
  ) INTO v_next_driver_id;
  
  -- If no partner found, try internal fleet drivers
  IF v_next_driver_id IS NULL THEN
    SELECT find_nearest_available_fleet_driver(
      v_course.fleet_manager_id,
      v_course.pickup_latitude,
      v_course.pickup_longitude,
      v_course.scheduled_date,
      COALESCE(v_course.duration_minutes, 60),
      NULL,
      p_course_id
    ) INTO v_next_driver_id;
  END IF;
  
  -- If still no driver found
  IF v_next_driver_id IS NULL THEN
    -- Increment dispatch round for retry later
    UPDATE courses 
    SET dispatch_round = COALESCE(dispatch_round, 0) + 1,
        last_dispatched_at = NOW(),
        updated_at = NOW()
    WHERE id = p_course_id;
    
    -- Create escalation for manual intervention
    INSERT INTO fleet_course_escalations (
      course_id, 
      fleet_manager_id, 
      escalation_type,
      escalation_reason, 
      escalation_message,
      status
    ) VALUES (
      p_course_id,
      v_course.fleet_manager_id,
      'no_driver_available',
      'auto_dispatch_failed',
      'Aucun chauffeur disponible après ' || (COALESCE(v_course.dispatch_round, 0) + 1) || ' tentative(s)',
      'pending'
    )
    ON CONFLICT DO NOTHING;
    
    -- Notify fleet manager
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_fm_user_id,
      'Aucun chauffeur disponible',
      'Une course n''a pas pu être assignée automatiquement. Tous les chauffeurs ont refusé ou sont indisponibles.',
      'fleet_dispatch_failed',
      '/fleet-manager-dashboard?tab=escalations'
    );
    
    RETURN QUERY SELECT false, 'No available driver found'::text, NULL::uuid;
    RETURN;
  END IF;
  
  -- Get driver info
  SELECT d.user_id, p.full_name 
  INTO v_driver_user_id, v_driver_name
  FROM drivers d
  JOIN profiles p ON p.id = d.user_id
  WHERE d.id = v_next_driver_id;
  
  -- Assign the course to the next driver
  UPDATE courses 
  SET 
    driver_id = v_next_driver_id,
    status = 'accepted',
    dispatch_round = COALESCE(dispatch_round, 0) + 1,
    last_dispatched_at = NOW(),
    updated_at = NOW()
  WHERE id = p_course_id;
  
  -- Notify the assigned driver
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    v_driver_user_id,
    'Nouvelle course assignée',
    'Une course vous a été automatiquement assignée par le gestionnaire de flotte.',
    'fleet_course_assigned',
    '/driver-dashboard'
  );
  
  -- Notify fleet manager of successful assignment
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    v_fm_user_id,
    'Course réassignée automatiquement',
    'La course a été automatiquement assignée à ' || v_driver_name,
    'fleet_course_auto_assigned',
    '/fleet-manager-dashboard'
  );
  
  RETURN QUERY SELECT true, ('Course assigned to ' || v_driver_name)::text, v_next_driver_id;
END;
$$;