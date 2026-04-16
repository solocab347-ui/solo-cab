
-- Add client_response_deadline to rating_disputes if not exists
ALTER TABLE public.rating_disputes
ADD COLUMN IF NOT EXISTS client_response_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS client_response TEXT,
ADD COLUMN IF NOT EXISTS client_response_at TIMESTAMPTZ;

-- Trigger: notify driver when a new low rating is submitted
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
  -- Only for pending_review ratings (1-3 stars)
  IF NEW.status = 'pending_review' THEN
    -- Get driver user_id
    SELECT d.user_id INTO _driver_user_id
    FROM drivers d WHERE d.id = NEW.driver_id;

    -- Get course date
    SELECT to_char(c.scheduled_date, 'DD/MM/YYYY') INTO _course_date
    FROM courses c WHERE c.id = NEW.course_id;

    -- Insert notification
    INSERT INTO notifications (user_id, title, message, type, metadata)
    VALUES (
      _driver_user_id,
      'Nouvelle note reçue',
      'Vous avez reçu une note de ' || NEW.rating || '★ pour votre course du ' || COALESCE(_course_date, 'N/A') || '. Vous pouvez accepter ou contester cette note.',
      'rating',
      jsonb_build_object('rating_id', NEW.id, 'course_id', NEW.course_id, 'rating', NEW.rating, 'reason', NEW.reason)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_driver_new_rating ON public.course_ratings;
CREATE TRIGGER trigger_notify_driver_new_rating
  AFTER INSERT ON public.course_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_driver_new_rating();

-- Auto-set client_response_deadline when driver contests (48h from now)
CREATE OR REPLACE FUNCTION public.set_contest_client_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.initiated_by = 'driver' AND NEW.client_response_deadline IS NULL THEN
    NEW.client_response_deadline := now() + interval '48 hours';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_contest_deadline ON public.rating_disputes;
CREATE TRIGGER trigger_set_contest_deadline
  BEFORE INSERT ON public.rating_disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_contest_client_deadline();

-- Function to auto-cancel expired contested ratings (call periodically)
CREATE OR REPLACE FUNCTION public.auto_cancel_expired_contested_ratings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER := 0;
BEGIN
  -- Find disputed ratings where client hasn't responded within deadline
  UPDATE course_ratings cr
  SET status = 'cancelled', 
      ai_decision = 'cancelled',
      ai_justification = 'Note annulée automatiquement : le client n''a pas répondu dans le délai de 48 heures.',
      updated_at = now()
  FROM rating_disputes rd
  WHERE rd.rating_id = cr.id
    AND cr.status = 'contested'
    AND rd.client_response IS NULL
    AND rd.client_response_deadline < now();

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_cancel_expired_contested_ratings() TO authenticated;
