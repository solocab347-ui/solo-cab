
-- Trigger: notify client when a driver contests their rating
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
  -- Only for driver-initiated disputes
  IF NEW.initiated_by = 'driver' THEN
    -- Get the rating info
    SELECT cr.rating, cr.client_id INTO _rating_value, _client_id
    FROM course_ratings cr WHERE cr.id = NEW.rating_id;

    -- Only notify registered clients (not guests)
    IF _client_id IS NOT NULL THEN
      -- Get client user_id
      SELECT c.user_id INTO _client_user_id
      FROM clients c WHERE c.id = _client_id;

      IF _client_user_id IS NOT NULL THEN
        -- Get course date
        SELECT to_char(co.scheduled_date, 'DD/MM/YYYY') INTO _course_date
        FROM courses co
        JOIN course_ratings cr ON cr.course_id = co.id
        WHERE cr.id = NEW.rating_id;

        INSERT INTO notifications (user_id, title, message, type, metadata)
        VALUES (
          _client_user_id,
          'Votre note est contestée',
          'Le chauffeur a contesté votre note de ' || _rating_value || '★ pour la course du ' || COALESCE(_course_date, 'N/A') || '. Vous avez 48h pour donner votre version des faits, sinon la note sera automatiquement annulée.',
          'rating',
          jsonb_build_object('rating_id', NEW.rating_id, 'dispute_id', NEW.id, 'action', 'respond_to_contestation')
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_client_on_contestation ON public.rating_disputes;
CREATE TRIGGER trigger_notify_client_on_contestation
  AFTER INSERT ON public.rating_disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_on_rating_contestation();
