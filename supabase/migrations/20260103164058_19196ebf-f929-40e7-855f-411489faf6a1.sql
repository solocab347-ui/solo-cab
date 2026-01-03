-- Fix duplicate notification: Remove notification from trigger since it's already in RPC
-- Also unify notification message format and include commission

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
  
  -- SKIP notification for 'accepted' status - it's already handled in accept_shared_course_atomic RPC
  -- This prevents duplicate notifications
  
  -- When partner declines
  IF NEW.status = 'declined' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      sender_user_id,
      '❌ Course refusée par partenaire',
      COALESCE(receiver_name, 'Votre partenaire') || ' a refusé la course du ' || TO_CHAR(course_info.scheduled_date, 'DD/MM/YYYY') || '. Raison: ' || COALESCE(NEW.decline_reason, 'Non spécifiée'),
      'warning',
      '/driver-dashboard?tab=partnerships&subtab=sent'
    );
    NEW.sender_notified_at = NOW();
  END IF;
  
  -- When course is completed - also skip if already notified by another mechanism
  IF NEW.status = 'completed' AND OLD.status IN ('accepted', 'in_progress') THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      sender_user_id,
      '🎉 Course partenaire terminée',
      COALESCE(receiver_name, 'Votre partenaire') || ' a terminé la course. Commission à recevoir: ' || NEW.commission_amount || '€',
      'success',
      '/driver-dashboard?tab=partnerships&subtab=balances'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;