-- Add dispatch tracking columns to courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS dispatch_round INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_dispatched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_dispatch_enabled BOOLEAN DEFAULT true;

-- Create a function to automatically dispatch fleet courses
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
      NULL, -- no excluded driver
      p_course_id -- pass course_id for exclusions
    ) INTO v_next_driver_id;
  END IF;
  
  -- If still no driver found
  IF v_next_driver_id IS NULL THEN
    -- Increment dispatch round for retry later
    UPDATE courses 
    SET dispatch_round = dispatch_round + 1,
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
      'Aucun chauffeur disponible après ' || (v_course.dispatch_round + 1) || ' tentative(s)',
      'pending'
    )
    ON CONFLICT DO NOTHING;
    
    -- Notify fleet manager
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      v_course.fm_user_id,
      'Aucun chauffeur disponible',
      'Une course n''a pas pu être assignée automatiquement. Tous les chauffeurs ont refusé ou sont indisponibles.',
      'fleet_dispatch_failed',
      jsonb_build_object('course_id', p_course_id, 'dispatch_round', v_course.dispatch_round + 1)
    );
    
    RETURN QUERY SELECT false, 'No available driver found'::text, NULL::uuid;
    RETURN;
  END IF;
  
  -- Assign the course to the next driver
  UPDATE courses 
  SET 
    driver_id = v_next_driver_id,
    status = 'accepted',
    dispatch_round = dispatch_round + 1,
    last_dispatched_at = NOW(),
    updated_at = NOW()
  WHERE id = p_course_id;
  
  -- Get driver name for notification
  SELECT p.full_name INTO v_driver_name
  FROM drivers d
  JOIN profiles p ON p.id = d.user_id
  WHERE d.id = v_next_driver_id;
  
  -- Notify the assigned driver
  SELECT user_id INTO v_course FROM drivers WHERE id = v_next_driver_id;
  
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    v_course.user_id,
    'Nouvelle course assignée',
    'Une course vous a été automatiquement assignée par le gestionnaire de flotte.',
    'fleet_course_assigned',
    jsonb_build_object('course_id', p_course_id)
  );
  
  -- Notify fleet manager of successful assignment
  SELECT fm.user_id INTO v_course FROM fleet_managers fm 
  JOIN courses c ON c.fleet_manager_id = fm.id WHERE c.id = p_course_id;
  
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    v_course.user_id,
    'Course réassignée automatiquement',
    'La course a été automatiquement assignée à ' || v_driver_name,
    'fleet_course_auto_assigned',
    jsonb_build_object('course_id', p_course_id, 'driver_id', v_next_driver_id, 'driver_name', v_driver_name)
  );
  
  RETURN QUERY SELECT true, 'Course assigned to ' || v_driver_name, v_next_driver_id;
END;
$$;

-- Create trigger function for auto-dispatch when course returns to pending
CREATE OR REPLACE FUNCTION public.trigger_auto_dispatch_on_return()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger if:
  -- 1. Course has a fleet_manager_id
  -- 2. Status changed to 'pending'
  -- 3. driver_id is now NULL (course was returned)
  -- 4. auto_dispatch_enabled is true
  IF NEW.fleet_manager_id IS NOT NULL 
     AND NEW.status = 'pending' 
     AND NEW.driver_id IS NULL
     AND COALESCE(NEW.auto_dispatch_enabled, true) = true
     AND (OLD.driver_id IS NOT NULL OR OLD.status != 'pending') THEN
    
    -- Use pg_notify to trigger async processing (prevents blocking)
    PERFORM pg_notify('fleet_course_returned', json_build_object(
      'course_id', NEW.id,
      'fleet_manager_id', NEW.fleet_manager_id
    )::text);
    
    -- Also call auto_dispatch directly for immediate processing
    PERFORM auto_dispatch_fleet_course(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_dispatch_fleet_course_trigger ON courses;
CREATE TRIGGER auto_dispatch_fleet_course_trigger
  AFTER UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_dispatch_on_return();