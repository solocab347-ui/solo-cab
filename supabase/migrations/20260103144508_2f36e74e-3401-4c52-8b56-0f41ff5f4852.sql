
-- Fix notify_client_course_shared trigger to not use "data" column which doesn't exist
CREATE OR REPLACE FUNCTION notify_client_course_shared()
RETURNS TRIGGER AS $$
DECLARE
  v_client_user_id uuid;
  v_course_info record;
  v_receiver_driver_name text;
  v_receiver_photo text;
BEGIN
  -- Seulement pour les nouveaux partages avec receiver défini (pas pool mode initial)
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' AND NEW.receiver_driver_id IS NOT NULL THEN
    -- Récupérer les infos de la course et du client
    SELECT c.pickup_address, c.destination_address, c.scheduled_date, cl.user_id
    INTO v_course_info
    FROM courses c
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = NEW.course_id;

    IF v_course_info.user_id IS NOT NULL THEN
      -- Récupérer le nom du chauffeur partenaire (receiver)
      SELECT p.full_name
      INTO v_receiver_driver_name
      FROM drivers d
      JOIN profiles p ON d.user_id = p.id
      WHERE d.id = NEW.receiver_driver_id;

      -- Créer la notification pour le client (sans la colonne data qui n'existe pas)
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

      -- Marquer que le client a été notifié
      UPDATE shared_courses 
      SET client_notified = true, client_notified_at = NOW()
      WHERE id = NEW.id;
    END IF;
  END IF;

  -- Notifier le client quand le partenaire accepte
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT cl.user_id INTO v_course_info.user_id
    FROM courses c
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = NEW.course_id;

    IF v_course_info.user_id IS NOT NULL THEN
      SELECT p.full_name INTO v_receiver_driver_name
      FROM drivers d
      JOIN profiles p ON d.user_id = p.id
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
  END IF;

  -- Notifier le client quand la course est démarrée par le partenaire
  IF TG_OP = 'UPDATE' AND OLD.status IN ('pending', 'accepted') AND NEW.status = 'in_progress' THEN
    SELECT cl.user_id INTO v_course_info.user_id
    FROM courses c
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = NEW.course_id;

    IF v_course_info.user_id IS NOT NULL THEN
      SELECT p.full_name INTO v_receiver_driver_name
      FROM drivers d
      JOIN profiles p ON d.user_id = p.id
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
  END IF;

  -- Notifier le client quand la course est terminée
  IF TG_OP = 'UPDATE' AND OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
    SELECT cl.user_id INTO v_course_info.user_id
    FROM courses c
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = NEW.course_id;

    IF v_course_info.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link, created_at)
      VALUES (
        v_course_info.user_id,
        'course_completed_by_partner',
        'Course terminée',
        'Votre course a été effectuée avec succès. N''hésitez pas à laisser une évaluation.',
        '/client-dashboard',
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
