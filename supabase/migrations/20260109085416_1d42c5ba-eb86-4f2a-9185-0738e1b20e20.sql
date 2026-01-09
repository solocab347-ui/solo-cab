-- Create table to track driver exclusions per course
CREATE TABLE IF NOT EXISTS public.course_driver_exclusions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  exclusion_reason TEXT NOT NULL,
  excluded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, driver_id)
);

-- Enable RLS
ALTER TABLE public.course_driver_exclusions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Fleet managers can view exclusions for their courses"
ON public.course_driver_exclusions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses c
    JOIN fleet_managers fm ON fm.id = c.fleet_manager_id
    WHERE c.id = course_id AND fm.user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can view their own exclusions"
ON public.course_driver_exclusions FOR SELECT
USING (driver_id = get_driver_id(auth.uid()));

-- Index for performance
CREATE INDEX idx_course_driver_exclusions_course ON public.course_driver_exclusions(course_id);
CREATE INDEX idx_course_driver_exclusions_driver ON public.course_driver_exclusions(driver_id);

-- Update the return_course_to_fleet_manager function to record exclusion
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
  
  -- Record exclusion so this driver won't receive this course again
  INSERT INTO course_driver_exclusions (course_id, driver_id, exclusion_reason)
  VALUES (p_course_id, v_driver_id, p_reason)
  ON CONFLICT (course_id, driver_id) DO NOTHING;
  
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