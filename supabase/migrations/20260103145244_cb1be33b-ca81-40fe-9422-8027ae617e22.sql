
-- Fix notify_shared_course trigger: better link and unified notification
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
  
  -- Notify receiver (the partner who receives the course) - with correct deep link
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    receiver_user_id,
    '🤝 Nouvelle course partagée',
    COALESCE(sender_name, 'Un partenaire') || ' vous envoie une course du ' || TO_CHAR(course_info.scheduled_date, 'DD/MM/YYYY à HH24:MI'),
    'info',
    '/driver-dashboard?tab=partnerships&subtab=received'
  );
  
  NEW.receiver_notified_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix notify_client_course_shared to ONLY notify CLIENT, not receiver driver
-- This trigger should only notify the CLIENT of the course, not the receiver driver
CREATE OR REPLACE FUNCTION notify_client_course_shared()
RETURNS TRIGGER AS $$
DECLARE
  v_client_user_id uuid;
  v_course_info record;
  v_receiver_driver_name text;
BEGIN
  -- Skip if no receiver yet (pool mode initial) or not pending
  IF NEW.receiver_driver_id IS NULL OR NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;
  
  -- Only on INSERT for new pending shares
  IF TG_OP = 'INSERT' THEN
    -- Get course info AND CLIENT user_id (not driver!)
    SELECT c.pickup_address, c.destination_address, c.scheduled_date, cl.user_id
    INTO v_course_info
    FROM courses c
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = NEW.course_id;

    -- Only notify if there is a client (not driver)
    IF v_course_info.user_id IS NOT NULL THEN
      -- Get partner driver name
      SELECT p.full_name
      INTO v_receiver_driver_name
      FROM drivers d
      JOIN profiles p ON d.user_id = p.id
      WHERE d.id = NEW.receiver_driver_id;

      -- Create notification for CLIENT (not driver)
      INSERT INTO notifications (user_id, type, title, message, link, created_at)
      VALUES (
        v_course_info.user_id,
        'course_shared_with_partner',
        'Votre course a été confiée à un partenaire',
        'Un chauffeur partenaire de confiance (' || COALESCE(v_receiver_driver_name, 'Partenaire') || ') assurera votre course du ' || 
        TO_CHAR(v_course_info.scheduled_date, 'DD/MM/YYYY à HH24:MI'),
        '/client-dashboard',
        NOW()
      );

      -- Mark client notified
      UPDATE shared_courses 
      SET client_notified = true, client_notified_at = NOW()
      WHERE id = NEW.id;
    END IF;
  END IF;

  -- Handle status updates (accepted, in_progress, completed) for CLIENT notifications
  IF TG_OP = 'UPDATE' THEN
    -- Get client user_id
    SELECT cl.user_id INTO v_course_info.user_id
    FROM courses c
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = NEW.course_id;

    -- Only proceed if there's a client
    IF v_course_info.user_id IS NOT NULL THEN
      -- Partner accepts
      IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
        SELECT p.full_name INTO v_receiver_driver_name
        FROM drivers d JOIN profiles p ON d.user_id = p.id
        WHERE d.id = NEW.receiver_driver_id;

        INSERT INTO notifications (user_id, type, title, message, link, created_at)
        VALUES (
          v_course_info.user_id,
          'partner_accepted_course',
          'Partenaire confirmé',
          COALESCE(v_receiver_driver_name, 'Votre chauffeur partenaire') || ' a accepté d''assurer votre course.',
          '/client-dashboard',
          NOW()
        );
      END IF;

      -- Partner starts course
      IF OLD.status IN ('pending', 'accepted') AND NEW.status = 'in_progress' THEN
        SELECT p.full_name INTO v_receiver_driver_name
        FROM drivers d JOIN profiles p ON d.user_id = p.id
        WHERE d.id = NEW.receiver_driver_id;

        INSERT INTO notifications (user_id, type, title, message, link, created_at)
        VALUES (
          v_course_info.user_id,
          'partner_started_course',
          'Course démarrée',
          COALESCE(v_receiver_driver_name, 'Votre chauffeur') || ' a démarré votre course.',
          '/client-dashboard',
          NOW()
        );
      END IF;

      -- Course completed
      IF OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
        INSERT INTO notifications (user_id, type, title, message, link, created_at)
        VALUES (
          v_course_info.user_id,
          'course_completed_by_partner',
          'Course terminée',
          'Votre course a été effectuée avec succès.',
          '/client-dashboard',
          NOW()
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
