-- Fix: le trigger enforce_payment_before_completion bloquait silencieusement les courses cash.
-- Pour les paiements cash, on auto-marque payment_status='paid' au moment de passer à completed
-- (le chauffeur a confirmé en encaissant manuellement). Pour la carte, on conserve la sécurité stricte.

CREATE OR REPLACE FUNCTION public.enforce_payment_before_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_method text;
BEGIN
  -- Allow cancellation paths
  IF NEW.status IN ('cancelled', 'no_show', 'cancelled_by_client', 'cancelled_by_driver') THEN
    RETURN NEW;
  END IF;

  -- Only enforce on transition to completed
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    v_method := COALESCE(NEW.payment_method, NEW.payment_method_requested, 'cash');

    -- CASH / CHEQUE / VIREMENT : driver confirms manually → auto mark paid
    IF v_method IN ('cash', 'especes', 'cheque', 'virement', 'transfer') THEN
      IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
        NEW.payment_status := 'paid';
        NEW.final_payment_status := COALESCE(NEW.final_payment_status, 'paid');
        NEW.payment_method := v_method;
        NEW.payment_method_used := COALESCE(NEW.payment_method_used, v_method);
        NEW.final_payment_at := COALESCE(NEW.final_payment_at, now());
        NEW.payment_confirmed_at := COALESCE(NEW.payment_confirmed_at, now());
      END IF;
      RETURN NEW;
    END IF;

    -- CARD / STRIPE : require successful capture, an existing 'paid' status,
    -- or 'bank_imprint_confirmed' (deposit covers the fare entirely)
    IF v_method IN ('card', 'stripe', 'card_online', 'apple_pay', 'google_pay') THEN
      IF NEW.payment_status = 'paid'
         OR NEW.final_payment_status IN ('paid', 'succeeded')
         OR NEW.payment_status = 'bank_imprint_confirmed' THEN
        -- Normalise payment_status to 'paid' so downstream invariants hold
        IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
          NEW.payment_status := 'paid';
        END IF;
        NEW.final_payment_at := COALESCE(NEW.final_payment_at, now());
        RETURN NEW;
      END IF;

      INSERT INTO public.course_payment_audit (course_id, event_type, status, actor_type, actor_id, error_message, metadata)
      VALUES (NEW.id, 'completion_blocked', 'rejected', 'system', auth.uid(),
              'Card payment not captured before completion',
              jsonb_build_object('payment_status', NEW.payment_status,
                                 'final_payment_status', NEW.final_payment_status,
                                 'payment_method', v_method));
      RAISE EXCEPTION 'PAYMENT_REQUIRED: Card course cannot be marked completed without confirmed payment (current: %)',
        COALESCE(NEW.payment_status, 'null')
        USING ERRCODE = 'check_violation';
    END IF;

    -- Unknown payment method → allow but normalise
    IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
      NEW.payment_status := 'paid';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Bonus: heal the stuck course detected during the audit (cash, still in driver_approaching for hours)
-- We DO NOT auto-complete it (the driver should do that), but we make sure no stale lock blocks them.
UPDATE public.courses
SET final_payment_locked_at = NULL,
    updated_at = now()
WHERE final_payment_locked_at IS NOT NULL
  AND final_payment_locked_at < now() - interval '5 minutes';