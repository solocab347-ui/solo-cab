-- Corriger les triggers qui utilisent app.settings non configurés
-- On va simplement supprimer les appels HTTP qui causent l'erreur
-- Les notifications internes continueront de fonctionner

-- Corriger notify_driver_devis_accepted_with_email
CREATE OR REPLACE FUNCTION public.notify_driver_devis_accepted_with_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted') THEN
    SELECT user_id INTO v_driver_user_id
    FROM drivers
    WHERE id = NEW.driver_id;
    
    SELECT full_name INTO v_client_name
    FROM profiles
    WHERE id = (SELECT user_id FROM clients WHERE id = NEW.client_id);
    
    IF v_driver_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_driver_user_id,
        '✅ Devis accepté',
        COALESCE(v_client_name, 'Un client') || ' a accepté votre devis de ' || NEW.amount::TEXT || '€',
        'success',
        '/driver-dashboard'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Corriger notify_driver_new_course_with_email
CREATE OR REPLACE FUNCTION public.notify_driver_new_course_with_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
  v_driver_id UUID;
  v_course_date TEXT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    SELECT full_name INTO v_client_name
    FROM profiles
    WHERE id = (SELECT user_id FROM clients WHERE id = NEW.client_id);
    
    v_course_date := to_char(NEW.scheduled_date::timestamp, 'DD/MM/YYYY à HH24:MI');
    
    IF NEW.driver_id IS NOT NULL THEN
      SELECT user_id INTO v_driver_user_id
      FROM drivers
      WHERE id = NEW.driver_id;
      
      IF v_driver_user_id IS NOT NULL THEN
        PERFORM create_notification(
          v_driver_user_id,
          '🚗 Nouvelle demande de course',
          COALESCE(v_client_name, 'Un client') || ' a créé une demande de course pour le ' || v_course_date,
          'course',
          '/driver-dashboard'
        );
      END IF;
    END IF;
    
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