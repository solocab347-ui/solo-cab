
-- 1) Add missing metadata column to notifications (used by 3 rating triggers)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2) Harden the 3 rating triggers with EXCEPTION handling so a notification
--    failure NEVER blocks the rating insert (the actual root cause of low-rating bug).

-- 2a) notify_driver_new_rating
CREATE OR REPLACE FUNCTION public.notify_driver_new_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _driver_user_id UUID;
  _course_date TEXT;
BEGIN
  IF NEW.status = 'pending_review' AND COALESCE(NEW.rating_direction, 'client_to_driver') = 'client_to_driver' THEN
    BEGIN
      SELECT d.user_id INTO _driver_user_id FROM drivers d WHERE d.id = NEW.driver_id;
      SELECT to_char(c.scheduled_date, 'DD/MM/YYYY') INTO _course_date FROM courses c WHERE c.id = NEW.course_id;

      IF _driver_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, metadata)
        VALUES (
          _driver_user_id,
          'Nouvelle note reçue',
          'Vous avez reçu une note de ' || NEW.rating || '★ pour votre course du ' || COALESCE(_course_date, 'N/A') || '. Vous pouvez accepter ou contester cette note sous 48h.',
          'rating',
          jsonb_build_object('rating_id', NEW.id, 'course_id', NEW.course_id, 'rating', NEW.rating, 'reason', NEW.reason, 'action', 'respond_to_rating')
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_driver_new_rating failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- 2b) notify_on_driver_rates_client
CREATE OR REPLACE FUNCTION public.notify_on_driver_rates_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client_user_id UUID;
  _course_date TEXT;
BEGIN
  IF NEW.rating_direction = 'driver_to_client' AND NEW.status = 'pending_review' AND NEW.client_id IS NOT NULL THEN
    BEGIN
      SELECT c.user_id INTO _client_user_id FROM clients c WHERE c.id = NEW.client_id;
      SELECT to_char(co.scheduled_date, 'DD/MM/YYYY') INTO _course_date FROM courses co WHERE co.id = NEW.course_id;

      IF _client_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, metadata)
        VALUES (
          _client_user_id,
          'Note reçue du chauffeur',
          'Le chauffeur vous a attribué une note de ' || NEW.rating || '★ pour votre course du ' || COALESCE(_course_date, 'N/A') || '. Vous pouvez la contester sous 48h.',
          'rating',
          jsonb_build_object('rating_id', NEW.id, 'course_id', NEW.course_id, 'rating', NEW.rating, 'direction', 'driver_to_client', 'action', 'respond_to_rating')
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_on_driver_rates_client failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- 2c) notify_client_on_rating_contestation
CREATE OR REPLACE FUNCTION public.notify_client_on_rating_contestation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client_user_id UUID;
  _course_date TEXT;
  _rating_value INT;
  _client_id UUID;
BEGIN
  IF NEW.initiated_by = 'driver' THEN
    BEGIN
      SELECT cr.rating, cr.client_id INTO _rating_value, _client_id
      FROM course_ratings cr WHERE cr.id = NEW.rating_id;

      IF _client_id IS NOT NULL THEN
        SELECT c.user_id INTO _client_user_id FROM clients c WHERE c.id = _client_id;

        IF _client_user_id IS NOT NULL THEN
          SELECT to_char(co.scheduled_date, 'DD/MM/YYYY') INTO _course_date
          FROM courses co
          JOIN course_ratings cr ON cr.course_id = co.id
          WHERE cr.id = NEW.rating_id;

          INSERT INTO notifications (user_id, title, message, type, metadata)
          VALUES (
            _client_user_id,
            'Votre note est contestée',
            'Le chauffeur a contesté votre note de ' || _rating_value || '★ pour la course du ' || COALESCE(_course_date, 'N/A') || '. Vous avez 48h pour donner votre version, sinon la note sera annulée automatiquement.',
            'rating',
            jsonb_build_object('rating_id', NEW.rating_id, 'dispute_id', NEW.id, 'action', 'respond_to_contestation')
          );
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'notify_client_on_rating_contestation failed: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Auto-set client_response_deadline to 48h on pending_review course_ratings
--    (needed so the client knows the response window without depending on disputes table)
CREATE OR REPLACE FUNCTION public.set_rating_response_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pending_review' AND NEW.client_response_deadline IS NULL THEN
    NEW.client_response_deadline := now() + interval '48 hours';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_rating_response_deadline ON public.course_ratings;
CREATE TRIGGER trigger_set_rating_response_deadline
  BEFORE INSERT ON public.course_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_rating_response_deadline();

-- 4) Auto-finalize pending_review ratings whose 48h window has elapsed
--    without contestation → status becomes 'validated'.
CREATE OR REPLACE FUNCTION public.auto_validate_uncontested_ratings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER := 0;
BEGIN
  UPDATE course_ratings
  SET status = 'validated', updated_at = now()
  WHERE status = 'pending_review'
    AND client_response_deadline IS NOT NULL
    AND client_response_deadline < now()
    AND NOT EXISTS (
      SELECT 1 FROM rating_disputes rd WHERE rd.rating_id = course_ratings.id
    );

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_validate_uncontested_ratings() TO authenticated;
