-- Fonction pour calculer et mettre à jour la note moyenne d'un chauffeur
CREATE OR REPLACE FUNCTION public.update_driver_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _driver_id UUID;
  _avg_rating NUMERIC;
BEGIN
  -- Récupérer le driver_id de la course
  _driver_id := NEW.driver_id;
  
  -- Si pas de driver_id, sortir
  IF _driver_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculer la moyenne des notes pour ce chauffeur
  SELECT AVG(client_rating)::NUMERIC(3,2)
  INTO _avg_rating
  FROM public.courses
  WHERE driver_id = _driver_id
    AND client_rating IS NOT NULL
    AND status = 'completed';
  
  -- Mettre à jour la note du chauffeur
  UPDATE public.drivers
  SET rating = _avg_rating
  WHERE id = _driver_id;
  
  RETURN NEW;
END;
$$;

-- Créer un trigger qui se déclenche après la mise à jour d'une course avec une note
DROP TRIGGER IF EXISTS update_driver_rating_trigger ON public.courses;
CREATE TRIGGER update_driver_rating_trigger
  AFTER UPDATE OF client_rating ON public.courses
  FOR EACH ROW
  WHEN (NEW.client_rating IS NOT NULL)
  EXECUTE FUNCTION public.update_driver_rating();