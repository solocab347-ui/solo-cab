-- Fix the trigger to use 'accepted' instead of 'confirmed' which doesn't exist in the enum
CREATE OR REPLACE FUNCTION public.update_course_on_shared_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When a shared course is accepted, mark the original course
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.accepted_at = NOW();
    
    -- Update course to indicate it's being handled by partner
    -- Use 'accepted' status instead of 'confirmed' (which doesn't exist in enum)
    UPDATE courses
    SET status = 'accepted',
        notes = COALESCE(notes, '') || E'\n[Course transmise au partenaire et acceptée]',
        updated_at = NOW()
    WHERE id = NEW.course_id;
  END IF;
  
  -- When a shared course is completed
  IF NEW.status = 'completed' AND OLD.status IN ('accepted', 'in_progress') THEN
    NEW.completed_at = NOW();
    
    -- Update course to completed
    UPDATE courses
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = NEW.course_id;
  END IF;
  
  -- When a shared course is declined
  IF NEW.status = 'declined' AND OLD.status = 'pending' THEN
    NEW.declined_at = NOW();
  END IF;
  
  -- When shared course starts
  IF NEW.status = 'in_progress' AND OLD.status = 'accepted' THEN
    NEW.started_at = NOW();
    
    UPDATE courses
    SET status = 'in_progress',
        updated_at = NOW()
    WHERE id = NEW.course_id;
  END IF;
  
  RETURN NEW;
END;
$function$;