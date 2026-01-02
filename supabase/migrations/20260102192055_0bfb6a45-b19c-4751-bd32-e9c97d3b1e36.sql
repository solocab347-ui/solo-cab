-- Trigger to notify partner when shared course is completed
CREATE OR REPLACE FUNCTION public.notify_shared_course_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_shared_course RECORD;
  v_sender_user_id UUID;
  v_receiver_name TEXT;
  v_course_amount NUMERIC;
BEGIN
  -- Only trigger when course is completed
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    
    -- Find if this was a shared course
    SELECT sc.*, 
           d_sender.user_id as sender_user_id,
           p_receiver.full_name as receiver_name
    INTO v_shared_course
    FROM shared_courses sc
    JOIN drivers d_sender ON sc.sender_driver_id = d_sender.id
    JOIN drivers d_receiver ON sc.receiver_driver_id = d_receiver.id
    JOIN profiles p_receiver ON d_receiver.user_id = p_receiver.id
    WHERE sc.course_id = NEW.id
      AND sc.status = 'accepted';
    
    IF v_shared_course IS NOT NULL THEN
      -- Update shared course status
      UPDATE shared_courses
      SET status = 'completed',
          completed_at = now(),
          updated_at = now()
      WHERE id = v_shared_course.id;
      
      -- Notify the original sender that partner completed the course
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_shared_course.sender_user_id,
        '🏁 Course partenaire terminée',
        v_shared_course.receiver_name || ' a effectué votre course (Commission: ' || v_shared_course.commission_amount || '€)',
        'success',
        '/driver-dashboard?tab=partnerships'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS notify_shared_course_completed_trigger ON courses;
CREATE TRIGGER notify_shared_course_completed_trigger
AFTER UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION notify_shared_course_completed();