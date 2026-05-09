
-- Fonction qui re-synchronise le statut d'un chauffeur à partir de ses courses actives.
-- Idempotente, sûre, ignore offline/break (états manuels).
CREATE OR REPLACE FUNCTION public.sync_driver_status_for_driver(_driver_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  curr_status text;
  has_in_progress boolean;
  has_active boolean;
BEGIN
  IF _driver_id IS NULL THEN
    RETURN;
  END IF;

  SELECT driver_status INTO curr_status
  FROM public.drivers
  WHERE id = _driver_id
  FOR UPDATE;

  IF curr_status IS NULL THEN
    RETURN;
  END IF;

  -- Ne jamais écraser les états manuels.
  IF curr_status IN ('offline', 'break') THEN
    RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.courses
    WHERE driver_id = _driver_id
      AND status = 'in_progress'
  ) INTO has_in_progress;

  SELECT EXISTS(
    SELECT 1 FROM public.courses
    WHERE driver_id = _driver_id
      AND status IN ('accepted','driver_approaching','driver_arrived','in_progress')
  ) INTO has_active;

  IF has_in_progress THEN
    UPDATE public.drivers
       SET driver_status = 'in_ride',
           is_available_now = false,
           updated_at = now()
     WHERE id = _driver_id
       AND (driver_status IS DISTINCT FROM 'in_ride' OR is_available_now IS DISTINCT FROM false);
  ELSIF has_active THEN
    UPDATE public.drivers
       SET driver_status = 'assigned',
           is_available_now = false,
           updated_at = now()
     WHERE id = _driver_id
       AND (driver_status IS DISTINCT FROM 'assigned' OR is_available_now IS DISTINCT FROM false);
  ELSE
    -- Plus aucune course active : on ne libère que si on était bloqué en assigned/in_ride.
    IF curr_status IN ('assigned','in_ride') THEN
      UPDATE public.drivers
         SET driver_status = 'online',
             is_available_now = true,
             updated_at = now()
       WHERE id = _driver_id;
    END IF;
  END IF;
END;
$$;

-- Trigger function : appelée après chaque INSERT/UPDATE/DELETE sur courses.
CREATE OR REPLACE FUNCTION public.trg_courses_sync_driver_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_driver_status_for_driver(OLD.driver_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.driver_id IS DISTINCT FROM NEW.driver_id THEN
    PERFORM public.sync_driver_status_for_driver(OLD.driver_id);
  END IF;

  PERFORM public.sync_driver_status_for_driver(NEW.driver_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_sync_driver_status ON public.courses;

CREATE TRIGGER courses_sync_driver_status
AFTER INSERT OR UPDATE OF status, driver_id OR DELETE
ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.trg_courses_sync_driver_status();

-- Reconciliation immédiate de tous les chauffeurs actuellement marqués busy
-- pour rattraper les états incohérents existants.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.drivers
    WHERE driver_status IN ('assigned','in_ride')
  LOOP
    PERFORM public.sync_driver_status_for_driver(r.id);
  END LOOP;
END $$;
