-- Create function to allow drivers to return a course to fleet manager
CREATE OR REPLACE FUNCTION public.return_course_to_fleet_manager(
  p_course_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_course_driver_id UUID;
  v_fleet_manager_id UUID;
BEGIN
  -- Get the driver ID for the current user
  SELECT id INTO v_driver_id FROM drivers WHERE user_id = auth.uid();
  
  IF v_driver_id IS NULL THEN
    RAISE EXCEPTION 'User is not a driver';
  END IF;
  
  -- Get the course and verify it belongs to this driver and has a fleet manager
  SELECT driver_id, fleet_manager_id 
  INTO v_course_driver_id, v_fleet_manager_id
  FROM courses 
  WHERE id = p_course_id;
  
  IF v_course_driver_id IS NULL OR v_course_driver_id != v_driver_id THEN
    RAISE EXCEPTION 'Course not assigned to this driver';
  END IF;
  
  IF v_fleet_manager_id IS NULL THEN
    RAISE EXCEPTION 'Course is not from a fleet manager';
  END IF;
  
  -- Update the course - set status to pending and remove driver assignment
  UPDATE courses
  SET 
    status = 'pending',
    driver_id = NULL,
    notes = COALESCE(notes, '') || E'\n[RETOURNÉ AU GESTIONNAIRE] Motif: ' || p_reason,
    updated_at = NOW()
  WHERE id = p_course_id;
  
  RETURN TRUE;
END;
$$;