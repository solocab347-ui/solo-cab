-- Désactiver le trigger problématique qui utilise app.settings non configuré
DROP TRIGGER IF EXISTS trigger_notify_driver_new_course ON public.courses;

-- Le remplacer par la version simple sans appel HTTP
CREATE OR REPLACE FUNCTION public.notify_driver_new_course_simple()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
  v_driver_id UUID;
  v_course_date TEXT;
BEGIN
  -- Si une course est nouvellement créée avec status 'pending'
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    
    -- Récupérer le nom du client (si existe)
    IF NEW.client_id IS NOT NULL THEN
      SELECT full_name INTO v_client_name
      FROM profiles
      WHERE id = (SELECT user_id FROM clients WHERE id = NEW.client_id);
    ELSE
      v_client_name := COALESCE(NEW.guest_name, 'Client invité');
    END IF;
    
    -- Formater la date de la course
    v_course_date := to_char(NEW.scheduled_date::timestamp, 'DD/MM/YYYY à HH24:MI');
    
    -- Si driver_id est défini, notifier ce driver
    IF NEW.driver_id IS NOT NULL THEN
      SELECT user_id INTO v_driver_user_id
      FROM drivers
      WHERE id = NEW.driver_id;
      
      IF v_driver_user_id IS NOT NULL THEN
        -- Notification dans l'app uniquement (pas d'appel HTTP)
        PERFORM create_notification(
          v_driver_user_id,
          '🚗 Nouvelle demande de course',
          COALESCE(v_client_name, 'Un client') || ' a créé une demande de course pour le ' || v_course_date,
          'course',
          '/driver-dashboard'
        );
      END IF;
    END IF;
    
    -- Si driver_ids array est défini, notifier tous ces drivers
    IF NEW.driver_ids IS NOT NULL AND array_length(NEW.driver_ids, 1) > 0 THEN
      FOR v_driver_id IN SELECT unnest(NEW.driver_ids)
      LOOP
        SELECT user_id INTO v_driver_user_id
        FROM drivers
        WHERE id = v_driver_id;
        
        IF v_driver_user_id IS NOT NULL THEN
          PERFORM create_notification(
            v_driver_user_id,
            '🚗 Nouvelle demande de course',
            COALESCE(v_client_name, 'Un client') || ' a créé une demande de course pour le ' || v_course_date,
            'course',
            '/driver-dashboard'
          );
        END IF;
      END LOOP;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Créer le nouveau trigger simplifié
CREATE TRIGGER trigger_notify_driver_new_course
  AFTER INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION notify_driver_new_course_simple();