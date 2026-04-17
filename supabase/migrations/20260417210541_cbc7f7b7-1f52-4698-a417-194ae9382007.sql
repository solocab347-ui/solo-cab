CREATE OR REPLACE FUNCTION public.ensure_balance_pending_from_stripe_tx()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
  v_payment_type text;
BEGIN
  IF NEW.driver_id IS NULL OR NEW.status NOT IN ('succeeded', 'completed') THEN
    RETURN NEW;
  END IF;

  IF NEW.transaction_type IN ('refund', 'partner_transfer') THEN
    RETURN NEW;
  END IF;

  IF NEW.course_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM driver_balance_pending 
      WHERE driver_id = NEW.driver_id AND course_id = NEW.course_id
    ) INTO v_exists;
    IF v_exists THEN RETURN NEW; END IF;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM driver_balance_pending
    WHERE driver_id = NEW.driver_id
      AND ABS(EXTRACT(EPOCH FROM (created_at - NEW.created_at))) < 5
      AND gross_amount = COALESCE(NEW.gross_amount, 0)
      AND solocab_fee = COALESCE(NEW.solocab_fee_amount, 0)
  ) INTO v_exists;
  IF v_exists THEN RETURN NEW; END IF;

  v_payment_type := CASE 
    WHEN lower(COALESCE(NEW.payment_method, '')) IN ('cash','espèces','especes') THEN 'cash'
    WHEN NEW.transaction_type = 'shared_course_payment' AND NEW.payment_method = 'commission' THEN 'commission'
    ELSE 'card'
  END;

  INSERT INTO driver_balance_pending (
    driver_id, course_id, gross_amount, solocab_fee, stripe_fee, net_amount,
    payment_type, status, created_at
  ) VALUES (
    NEW.driver_id, NEW.course_id, 
    COALESCE(NEW.gross_amount, 0),
    COALESCE(NEW.solocab_fee_amount, 0),
    COALESCE(NEW.stripe_fee_amount, 0),
    COALESCE(NEW.net_amount, 0),
    v_payment_type, 'pending', NEW.created_at
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[ensure_balance_pending_from_stripe_tx] error tx=%: % %', NEW.id, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_balance_pending_from_stripe_tx ON stripe_transactions;
CREATE TRIGGER trg_ensure_balance_pending_from_stripe_tx
  AFTER INSERT OR UPDATE OF status ON stripe_transactions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_balance_pending_from_stripe_tx();

INSERT INTO driver_balance_pending (
  driver_id, course_id, gross_amount, solocab_fee, stripe_fee, net_amount,
  payment_type, status, created_at
)
SELECT 
  st.driver_id,
  st.course_id,
  COALESCE(st.gross_amount, 0),
  COALESCE(st.solocab_fee_amount, 0),
  COALESCE(st.stripe_fee_amount, 0),
  COALESCE(st.net_amount, 0),
  CASE 
    WHEN lower(COALESCE(st.payment_method, '')) IN ('cash','espèces','especes') THEN 'cash'
    WHEN st.transaction_type = 'shared_course_payment' AND st.payment_method = 'commission' THEN 'commission'
    ELSE 'card'
  END,
  'pending',
  st.created_at
FROM stripe_transactions st
WHERE st.driver_id IS NOT NULL
  AND st.status IN ('succeeded','completed')
  AND st.transaction_type NOT IN ('refund','partner_transfer')
  AND st.created_at >= date_trunc('week', now() - interval '1 week')
  AND NOT EXISTS (
    SELECT 1 FROM driver_balance_pending dbp
    WHERE dbp.driver_id = st.driver_id
      AND (
        (dbp.course_id IS NOT NULL AND dbp.course_id = st.course_id)
        OR (
          ABS(EXTRACT(EPOCH FROM (dbp.created_at - st.created_at))) < 60
          AND dbp.gross_amount = COALESCE(st.gross_amount, 0)
          AND dbp.solocab_fee = COALESCE(st.solocab_fee_amount, 0)
        )
      )
  );