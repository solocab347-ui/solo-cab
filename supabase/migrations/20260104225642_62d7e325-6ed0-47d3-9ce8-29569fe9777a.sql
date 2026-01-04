-- Fix notify_shared_course trigger: check if course_info is found before using it
CREATE OR REPLACE FUNCTION notify_shared_course()
RETURNS TRIGGER AS $$
DECLARE
  sender_user_id UUID;
  receiver_user_id UUID;
  sender_name TEXT;
  v_scheduled_date TIMESTAMPTZ;
  v_pickup_address TEXT;
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
  
  -- Get course info - into separate variables to avoid record not assigned error
  SELECT scheduled_date, pickup_address 
  INTO v_scheduled_date, v_pickup_address 
  FROM courses 
  WHERE id = NEW.course_id;
  
  -- Skip if course not found
  IF v_scheduled_date IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Notify receiver (the partner who receives the course) - with correct deep link
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    receiver_user_id,
    '🤝 Nouvelle course partagée',
    COALESCE(sender_name, 'Un partenaire') || ' vous envoie une course du ' || TO_CHAR(v_scheduled_date, 'DD/MM/YYYY à HH24:MI'),
    'info',
    '/driver-dashboard?tab=partnerships&subtab=received'
  );
  
  NEW.receiver_notified_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;