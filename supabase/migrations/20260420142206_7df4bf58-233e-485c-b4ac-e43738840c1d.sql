-- Add link to existing notification triggers so clicks navigate to the right tab

CREATE OR REPLACE FUNCTION public.notify_driver_new_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _driver_user_id UUID;
  _course_date TEXT;
BEGIN
  IF NEW.status = 'pending_review' AND COALESCE(NEW.rating_direction, 'client_to_driver') = 'client_to_driver' THEN
    BEGIN
      SELECT d.user_id INTO _driver_user_id FROM drivers d WHERE d.id = NEW.driver_id;
      SELECT to_char(c.scheduled_date, 'DD/MM/YYYY') INTO _course_date FROM courses c WHERE c.id = NEW.course_id;

      IF _driver_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, link, metadata)
        VALUES (
          _driver_user_id,
          'Nouvelle note reçue',
          'Vous avez reçu une note de ' || NEW.rating || '★ pour votre course du ' || COALESCE(_course_date, 'N/A') || '. Vous pouvez accepter ou contester cette note sous 48h.',
          'rating',
          '/driver/dashboard?tab=performance&sub=ratings',
          jsonb_build_object('rating_id', NEW.id, 'course_id', NEW.course_id, 'rating', NEW.rating, 'reason', NEW.reason, 'action', 'respond_to_rating')
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_driver_new_rating failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_driver_rates_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _client_user_id UUID;
  _course_date TEXT;
BEGIN
  IF NEW.rating_direction = 'driver_to_client' AND NEW.status = 'pending_review' THEN
    BEGIN
      IF NEW.client_id IS NOT NULL THEN
        SELECT cl.user_id INTO _client_user_id FROM clients cl WHERE cl.id = NEW.client_id;
        SELECT to_char(c.scheduled_date, 'DD/MM/YYYY') INTO _course_date FROM courses c WHERE c.id = NEW.course_id;

        IF _client_user_id IS NOT NULL THEN
          INSERT INTO notifications (user_id, title, message, type, link, metadata)
          VALUES (
            _client_user_id,
            'Note reçue du chauffeur',
            'Vous avez reçu une note de ' || NEW.rating || '★ pour votre course du ' || COALESCE(_course_date, 'N/A') || '. Vous pouvez contester cette note sous 48h.',
            'rating',
            '/client/dashboard?tab=notes',
            jsonb_build_object('rating_id', NEW.id, 'course_id', NEW.course_id, 'rating', NEW.rating, 'direction', 'driver_to_client', 'action', 'respond_to_rating')
          );
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_on_driver_rates_client failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$function$;