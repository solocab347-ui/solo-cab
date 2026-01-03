-- Add new status values and fields to shared_courses for complete workflow
-- Status flow: pending -> accepted -> in_progress -> completed OR pending -> declined

-- Add new columns for the complete workflow
ALTER TABLE public.shared_courses 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sender_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS receiver_notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS earnings_for_receiver NUMERIC GENERATED ALWAYS AS (course_amount - commission_amount) STORED,
ADD COLUMN IF NOT EXISTS payment_settled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_settled_at TIMESTAMP WITH TIME ZONE;

-- Add comment to document status values
COMMENT ON COLUMN public.shared_courses.status IS 'Status values: pending (sent to partner), accepted (partner accepted), in_progress (partner started course), completed (course finished), declined (partner refused)';

-- Create function to update course status when shared course is accepted
CREATE OR REPLACE FUNCTION update_course_on_shared_accept()
RETURNS TRIGGER AS $$
BEGIN
  -- When a shared course is accepted, mark the original course
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    NEW.accepted_at = NOW();
    
    -- Update course to indicate it's being handled by partner
    UPDATE courses
    SET status = 'confirmed',
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_course_on_shared_accept ON public.shared_courses;
CREATE TRIGGER trigger_update_course_on_shared_accept
  BEFORE UPDATE ON public.shared_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_course_on_shared_accept();

-- Create function to notify both parties when course is shared
CREATE OR REPLACE FUNCTION notify_shared_course()
RETURNS TRIGGER AS $$
DECLARE
  sender_user_id UUID;
  receiver_user_id UUID;
  sender_name TEXT;
  receiver_name TEXT;
  course_info RECORD;
BEGIN
  -- Get sender and receiver user IDs
  SELECT user_id INTO sender_user_id FROM drivers WHERE id = NEW.sender_driver_id;
  SELECT user_id INTO receiver_user_id FROM drivers WHERE id = NEW.receiver_driver_id;
  
  -- Get names
  SELECT full_name INTO sender_name FROM profiles WHERE id = sender_user_id;
  SELECT full_name INTO receiver_name FROM profiles WHERE id = receiver_user_id;
  
  -- Get course info
  SELECT scheduled_date, pickup_address INTO course_info FROM courses WHERE id = NEW.course_id;
  
  -- Notify receiver (the partner who receives the course)
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    receiver_user_id,
    '🤝 Nouvelle course partagée',
    'Vous avez reçu une course de ' || COALESCE(sender_name, 'un partenaire') || ' pour le ' || TO_CHAR(course_info.scheduled_date, 'DD/MM/YYYY à HH24:MI'),
    'info',
    '/driver-dashboard?tab=partage&subtab=recues'
  );
  
  NEW.receiver_notified_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new shared courses
DROP TRIGGER IF EXISTS trigger_notify_shared_course ON public.shared_courses;
CREATE TRIGGER trigger_notify_shared_course
  BEFORE INSERT ON public.shared_courses
  FOR EACH ROW
  EXECUTE FUNCTION notify_shared_course();

-- Create function to notify sender when partner accepts/declines
CREATE OR REPLACE FUNCTION notify_shared_course_response()
RETURNS TRIGGER AS $$
DECLARE
  sender_user_id UUID;
  receiver_name TEXT;
  course_info RECORD;
BEGIN
  -- Only process status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get sender user ID and receiver name
  SELECT user_id INTO sender_user_id FROM drivers WHERE id = NEW.sender_driver_id;
  SELECT p.full_name INTO receiver_name 
  FROM drivers d 
  JOIN profiles p ON p.id = d.user_id 
  WHERE d.id = NEW.receiver_driver_id;
  
  -- Get course info
  SELECT scheduled_date, pickup_address INTO course_info FROM courses WHERE id = NEW.course_id;
  
  -- When partner accepts
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      sender_user_id,
      '✅ Course acceptée par partenaire',
      COALESCE(receiver_name, 'Votre partenaire') || ' a accepté la course du ' || TO_CHAR(course_info.scheduled_date, 'DD/MM/YYYY'),
      'success',
      '/driver-dashboard?tab=partage&subtab=envoyees'
    );
    NEW.sender_notified_at = NOW();
  END IF;
  
  -- When partner declines
  IF NEW.status = 'declined' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      sender_user_id,
      '❌ Course refusée par partenaire',
      COALESCE(receiver_name, 'Votre partenaire') || ' a refusé la course du ' || TO_CHAR(course_info.scheduled_date, 'DD/MM/YYYY') || '. Raison: ' || COALESCE(NEW.decline_reason, 'Non spécifiée'),
      'warning',
      '/driver-dashboard?tab=partage&subtab=envoyees'
    );
    NEW.sender_notified_at = NOW();
  END IF;
  
  -- When course is completed
  IF NEW.status = 'completed' AND OLD.status IN ('accepted', 'in_progress') THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      sender_user_id,
      '🎉 Course partenaire terminée',
      COALESCE(receiver_name, 'Votre partenaire') || ' a terminé la course. Commission à recevoir: ' || NEW.commission_amount || '€',
      'success',
      '/driver-dashboard?tab=partage&subtab=soldes'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for shared course responses
DROP TRIGGER IF EXISTS trigger_notify_shared_course_response ON public.shared_courses;
CREATE TRIGGER trigger_notify_shared_course_response
  BEFORE UPDATE ON public.shared_courses
  FOR EACH ROW
  EXECUTE FUNCTION notify_shared_course_response();