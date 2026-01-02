-- Correction des liens dans les fonctions de notification unifiées
-- Pour utiliser le format cohérent avec le nouveau routage

-- Mise à jour de la fonction de notification pour nouvelle course
CREATE OR REPLACE FUNCTION public.unified_notify_new_course()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_user_id UUID;
  v_client_name TEXT;
  v_driver_name TEXT;
BEGIN
  IF NEW.client_id IS NULL AND NEW.is_guest_booking = true THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_driver_user_id FROM drivers WHERE id = NEW.driver_id;
  
  IF NEW.client_id IS NOT NULL THEN
    SELECT user_id INTO v_client_user_id FROM clients WHERE id = NEW.client_id;
    SELECT full_name INTO v_client_name FROM profiles WHERE id = v_client_user_id;
  END IF;
  
  SELECT COALESCE(p.full_name, d.company_name) INTO v_driver_name 
  FROM drivers d LEFT JOIN profiles p ON d.user_id = p.id WHERE d.id = NEW.driver_id;
  
  IF NEW.created_by_user_id = v_client_user_id THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_driver_user_id, '🚗 Nouvelle demande de course', 
            COALESCE(v_client_name, 'Un client') || ' souhaite réserver une course',
            'course_request', '/driver-dashboard?tab=courses');
  ELSIF NEW.created_by_user_id = v_driver_user_id THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_client_user_id, '📋 Nouveau devis disponible', 
              v_driver_name || ' vous a envoyé un devis',
              'devis_created', '/client-dashboard?tab=finances&subtab=devis');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Mise à jour de la fonction pour changement de statut de course
CREATE OR REPLACE FUNCTION public.unified_notify_course_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_user_id UUID;
  v_client_name TEXT;
  v_driver_name TEXT;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_driver_user_id FROM drivers WHERE id = NEW.driver_id;
  IF NEW.client_id IS NOT NULL THEN
    SELECT user_id INTO v_client_user_id FROM clients WHERE id = NEW.client_id;
    SELECT full_name INTO v_client_name FROM profiles WHERE id = v_client_user_id;
  END IF;
  SELECT COALESCE(p.full_name, d.company_name) INTO v_driver_name 
  FROM drivers d LEFT JOIN profiles p ON d.user_id = p.id WHERE d.id = NEW.driver_id;

  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_client_user_id, '✅ Course confirmée', 
              v_driver_name || ' a confirmé votre course',
              'success', '/client-dashboard?tab=courses');
    END IF;
  END IF;

  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_client_user_id, '🚕 Course en cours', 
              v_driver_name || ' est en route',
              'info', '/client-dashboard?tab=courses');
    END IF;
  END IF;

  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_client_user_id, '🏁 Course terminée', 
              'Votre course est terminée. Merci !',
              'success', '/client-dashboard?tab=courses');
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_client_user_id, '❌ Course annulée', 
              'Votre course a été annulée',
              'warning', '/client-dashboard?tab=courses');
    END IF;
    IF v_driver_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_driver_user_id, '❌ Course annulée', 
              'Une course a été annulée',
              'warning', '/driver-dashboard?tab=courses');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;