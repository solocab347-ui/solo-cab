-- 1) Patch trigger
CREATE OR REPLACE FUNCTION public.enforce_payment_before_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_method text;
BEGIN
  IF NEW.status::text = 'cancelled' THEN
    NEW.final_payment_locked_at := NULL;
    RETURN NEW;
  END IF;

  IF NEW.status::text IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  IF OLD.status::text = 'completed' THEN
    RETURN NEW;
  END IF;

  v_method := COALESCE(NEW.payment_method, OLD.payment_method, 'cash');

  IF v_method IN ('cash', 'especes', 'espèces', 'cheque', 'chèque', 'virement', 'manual') THEN
    IF COALESCE(NEW.payment_status, '') IS DISTINCT FROM 'paid' THEN
      NEW.payment_status := 'paid';
    END IF;
    IF COALESCE(NEW.final_payment_status, '') IS DISTINCT FROM 'paid' THEN
      NEW.final_payment_status := 'paid';
    END IF;
    NEW.final_payment_locked_at := NULL;
    RETURN NEW;
  END IF;

  IF v_method IN ('card', 'carte', 'stripe') THEN
    IF COALESCE(NEW.final_payment_status, NEW.payment_status, '') IN ('paid', 'captured', 'succeeded') THEN
      NEW.final_payment_locked_at := NULL;
      RETURN NEW;
    END IF;
    RAISE LOG 'enforce_payment_before_completion: card payment not yet confirmed for course % (status=%)', NEW.id, NEW.payment_status;
    RETURN NEW;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'enforce_payment_before_completion error on course %: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- 2) Débloque les courses coincées (>1h sans update)
UPDATE public.courses
SET 
  status = 'cancelled'::course_status,
  cancellation_reason = COALESCE(cancellation_reason, 'Auto-déblocage : course bloquée'),
  cancelled_at = COALESCE(cancelled_at, now()),
  final_payment_locked_at = NULL,
  updated_at = now()
WHERE status::text IN ('assigned', 'driver_approaching', 'driver_arrived', 'in_ride', 'pending_payment')
  AND updated_at < now() - interval '1 hour';

-- 3) Restaure la disponibilité des chauffeurs sans course active
UPDATE public.drivers d
SET 
  is_available_now = true,
  updated_at = now()
WHERE d.is_available_now = false
  AND NOT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.driver_id = d.id
      AND c.status::text IN ('assigned', 'driver_approaching', 'driver_arrived', 'in_ride', 'pending_payment')
  );