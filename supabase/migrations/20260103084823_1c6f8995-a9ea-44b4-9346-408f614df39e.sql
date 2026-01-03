-- Créer une fonction pour notifier le client quand sa course est partagée avec un partenaire
CREATE OR REPLACE FUNCTION notify_client_course_shared()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_user_id uuid;
  v_course_info record;
  v_receiver_driver_name text;
  v_receiver_photo text;
BEGIN
  -- Seulement pour les nouveaux partages (status = pending)
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Récupérer les infos de la course et du client
    SELECT c.pickup_address, c.destination_address, c.scheduled_date, cl.user_id
    INTO v_course_info
    FROM courses c
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = NEW.course_id;

    IF v_course_info.user_id IS NOT NULL THEN
      -- Récupérer le nom et photo du chauffeur partenaire (receiver)
      SELECT p.full_name, COALESCE(d.card_photo_url, p.profile_photo_url)
      INTO v_receiver_driver_name, v_receiver_photo
      FROM drivers d
      JOIN profiles p ON d.user_id = p.id
      WHERE d.id = NEW.receiver_driver_id;

      -- Créer la notification pour le client
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        data,
        created_at
      ) VALUES (
        v_course_info.user_id,
        'course_shared_with_partner',
        'Votre course a été confiée à un partenaire',
        'Un chauffeur partenaire de confiance assurera votre course du ' || 
        TO_CHAR(v_course_info.scheduled_date, 'DD/MM/YYYY à HH24:MI'),
        jsonb_build_object(
          'course_id', NEW.course_id,
          'shared_course_id', NEW.id,
          'partner_driver_id', NEW.receiver_driver_id,
          'partner_name', v_receiver_driver_name,
          'partner_photo', v_receiver_photo
        ),
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

      INSERT INTO notifications (
        user_id, type, title, message, data, created_at
      ) VALUES (
        v_course_info.user_id,
        'partner_accepted_course',
        'Partenaire confirmé',
        v_receiver_driver_name || ' a accepté d''assurer votre course.',
        jsonb_build_object('course_id', NEW.course_id, 'shared_course_id', NEW.id),
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

      INSERT INTO notifications (
        user_id, type, title, message, data, created_at
      ) VALUES (
        v_course_info.user_id,
        'partner_started_course',
        'Course démarrée',
        v_receiver_driver_name || ' a démarré votre course.',
        jsonb_build_object('course_id', NEW.course_id, 'shared_course_id', NEW.id),
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
      INSERT INTO notifications (
        user_id, type, title, message, data, created_at
      ) VALUES (
        v_course_info.user_id,
        'course_completed_by_partner',
        'Course terminée',
        'Votre course a été effectuée avec succès. N''hésitez pas à laisser une évaluation.',
        jsonb_build_object('course_id', NEW.course_id, 'shared_course_id', NEW.id),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Créer le trigger pour les notifications client sur partage
DROP TRIGGER IF EXISTS trigger_notify_client_course_shared ON shared_courses;
CREATE TRIGGER trigger_notify_client_course_shared
  AFTER INSERT OR UPDATE ON shared_courses
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_course_shared();

-- Vue sécurisée pour que le partenaire accède aux infos client UNIQUEMENT pendant la course active
CREATE OR REPLACE FUNCTION get_shared_course_client_info(p_shared_course_id uuid, p_receiver_driver_id uuid)
RETURNS TABLE (
  client_name text,
  client_phone text,
  client_photo text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shared_course record;
BEGIN
  -- Vérifier que le chauffeur est bien le receiver et que la course est active
  SELECT sc.*, c.client_id
  INTO v_shared_course
  FROM shared_courses sc
  JOIN courses c ON sc.course_id = c.id
  WHERE sc.id = p_shared_course_id
    AND sc.receiver_driver_id = p_receiver_driver_id
    AND sc.status IN ('pending', 'accepted', 'in_progress'); -- Accès uniquement tant que la course est active

  IF v_shared_course IS NULL THEN
    -- Pas d'accès
    RETURN;
  END IF;

  -- Retourner les infos client
  RETURN QUERY
  SELECT 
    p.full_name AS client_name,
    p.phone AS client_phone,
    p.profile_photo_url AS client_photo
  FROM clients cl
  JOIN profiles p ON cl.user_id = p.id
  WHERE cl.id = v_shared_course.client_id;
END;
$$;

-- Vue pour que le client voie les infos du partenaire qui effectue sa course
CREATE OR REPLACE FUNCTION get_course_partner_info(p_course_id uuid, p_client_user_id uuid)
RETURNS TABLE (
  shared_course_id uuid,
  shared_status text,
  partner_driver_id uuid,
  partner_name text,
  partner_photo text,
  partner_company text,
  partner_phone text,
  partner_vehicle_model text,
  partner_vehicle_color text,
  partner_rating numeric,
  partner_total_rides integer,
  show_rating boolean,
  show_phone boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est bien le client de cette course
  IF NOT EXISTS (
    SELECT 1 FROM courses c
    JOIN clients cl ON c.client_id = cl.id
    WHERE c.id = p_course_id AND cl.user_id = p_client_user_id
  ) THEN
    RETURN;
  END IF;

  -- Retourner les infos du partenaire actif
  RETURN QUERY
  SELECT 
    sc.id AS shared_course_id,
    sc.status AS shared_status,
    sc.receiver_driver_id AS partner_driver_id,
    p.full_name AS partner_name,
    COALESCE(d.card_photo_url, p.profile_photo_url) AS partner_photo,
    d.company_name AS partner_company,
    CASE WHEN d.show_phone_for_sharing = true THEN p.phone ELSE NULL END AS partner_phone,
    d.vehicle_model AS partner_vehicle_model,
    d.vehicle_color AS partner_vehicle_color,
    CASE WHEN d.show_rating_for_sharing = true THEN d.rating ELSE NULL END AS partner_rating,
    CASE WHEN d.show_rides_for_sharing = true THEN d.total_rides ELSE NULL END AS partner_total_rides,
    COALESCE(d.show_rating_for_sharing, false) AS show_rating,
    COALESCE(d.show_phone_for_sharing, false) AS show_phone
  FROM shared_courses sc
  JOIN drivers d ON sc.receiver_driver_id = d.id
  JOIN profiles p ON d.user_id = p.id
  WHERE sc.course_id = p_course_id
    AND sc.status IN ('pending', 'accepted', 'in_progress', 'completed')
  ORDER BY sc.created_at DESC
  LIMIT 1;
END;
$$;