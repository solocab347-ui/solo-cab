
CREATE OR REPLACE FUNCTION public.set_rating_response_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending_review' AND NEW.client_response_deadline IS NULL THEN
    NEW.client_response_deadline := now() + interval '48 hours';
  END IF;
  RETURN NEW;
END;
$$;
