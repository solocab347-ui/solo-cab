-- Fix notify_shared_course trigger to handle NULL receiver_driver_id and skip if already shared
CREATE OR REPLACE FUNCTION notify_shared_course()
RETURNS TRIGGER AS $$
DECLARE
  sender_user_id UUID;
  receiver_user_id UUID;
  sender_name TEXT;
  course_info RECORD;
BEGIN
  -- Skip notification if receiver is NULL (pool mode initial state)
  IF NEW.receiver_driver_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get sender and receiver user IDs
  SELECT user_id INTO sender_user_id FROM drivers WHERE id = NEW.sender_driver_id;
  SELECT user_id INTO receiver_user_id FROM drivers WHERE id = NEW.receiver_driver_id;
  
  -- Skip if receiver user not found
  IF receiver_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get sender name (first name only for proximity)
  SELECT SPLIT_PART(full_name, ' ', 1) INTO sender_name FROM profiles WHERE id = sender_user_id;
  
  -- Get course info
  SELECT scheduled_date, pickup_address INTO course_info FROM courses WHERE id = NEW.course_id;
  
  -- Notify receiver (the partner who receives the course)
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    receiver_user_id,
    '🤝 Nouvelle course partagée',
    'Vous avez reçu une course de ' || COALESCE(sender_name, 'un partenaire') || ' pour le ' || TO_CHAR(course_info.scheduled_date, 'DD/MM/YYYY à HH24:MI'),
    'info',
    '/driver-dashboard?tab=partnerships'
  );
  
  NEW.receiver_notified_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;