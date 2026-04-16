
-- Add rating direction to support bidirectional ratings
ALTER TABLE public.course_ratings
ADD COLUMN IF NOT EXISTS rating_direction TEXT NOT NULL DEFAULT 'client_to_driver',
ADD COLUMN IF NOT EXISTS rated_by_user_id UUID;

-- Drop old unique constraint and create new one that allows both directions
DO $$
BEGIN
  -- Try to drop existing unique constraint (may have different name)
  BEGIN
    ALTER TABLE public.course_ratings DROP CONSTRAINT IF EXISTS course_ratings_course_id_key;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.course_ratings DROP CONSTRAINT IF EXISTS course_ratings_course_id_client_id_key;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.course_ratings DROP CONSTRAINT IF EXISTS unique_course_rating;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Create unique constraint per direction per course
CREATE UNIQUE INDEX IF NOT EXISTS unique_course_rating_direction 
ON public.course_ratings (course_id, rating_direction);

-- Notify client when driver gives a low rating (1-3★)
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
  -- Only for driver_to_client ratings with status pending_review
  IF NEW.rating_direction = 'driver_to_client' AND NEW.status = 'pending_review' THEN
    IF NEW.client_id IS NOT NULL THEN
      SELECT c.user_id INTO _client_user_id
      FROM clients c WHERE c.id = NEW.client_id;

      SELECT to_char(co.scheduled_date, 'DD/MM/YYYY') INTO _course_date
      FROM courses co WHERE co.id = NEW.course_id;

      IF _client_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, metadata)
        VALUES (
          _client_user_id,
          'Note reçue du chauffeur',
          'Vous avez reçu une note de ' || NEW.rating || '★ pour votre course du ' || COALESCE(_course_date, 'N/A') || '. Vous pouvez contester cette note sous 48h.',
          'rating',
          jsonb_build_object('rating_id', NEW.id, 'course_id', NEW.course_id, 'rating', NEW.rating, 'direction', 'driver_to_client', 'action', 'respond_to_rating')
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_driver_rates_client ON public.course_ratings;
CREATE TRIGGER trigger_notify_on_driver_rates_client
  AFTER INSERT ON public.course_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_driver_rates_client();
