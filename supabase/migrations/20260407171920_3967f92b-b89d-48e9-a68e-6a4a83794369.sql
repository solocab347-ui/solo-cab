CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_stripe_payment_intent
ON public.payments(stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_financial_records_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_solocab_fee numeric;
  v_stripe_fee numeric;
  v_net numeric;
  v_event_at timestamptz;
  v_week_start date;
  v_payment_method text;
  v_fee_type text;
  v_payment_type text;
  v_transaction_type text;
  v_description text;
BEGIN
  IF NEW.status NOT IN ('succeeded', 'captured') THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.payment_type, '') IN ('card_hold', 'reservation_hold') THEN
    RETURN NEW;
  END IF;

  IF NEW.course_id IS NULL OR NEW.driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_amount := GREATEST(COALESCE(NEW.captured_amount, NEW.amount, 0), 0);
  IF v_amount <= 0 THEN
    RETURN NEW;
  END IF;

  v_event_at := COALESCE(NEW.captured_at, NEW.updated_at, NEW.created_at, now());
  v_week_start := date_trunc('week', v_event_at)::date;
  v_payment_method := lower(COALESCE(NEW.payment_method, ''));

  v_solocab_fee := GREATEST(
    COALESCE(
      NEW.application_fee_amount,
      CASE
        WHEN v_payment_method IN ('cash', 'espèces', 'especes') THEN LEAST(0.50, v_amount)
        ELSE LEAST(0.80, v_amount)
      END
    ),
    0
  );

  v_stripe_fee := GREATEST(
    COALESCE(
      NEW.stripe_fee_amount,
      CASE
        WHEN NEW.stripe_payment_intent_id IS NOT NULL THEN ROUND((v_amount * 0.015 + 0.25)::numeric, 2)
        ELSE 0
      END
    ),
    0
  );

  v_net := GREATEST(
    COALESCE(NEW.net_to_driver, v_amount - v_solocab_fee - v_stripe_fee),
    0
  );

  v_fee_type := CASE
    WHEN v_payment_method IN ('cash', 'espèces', 'especes') THEN 'cash_commission'
    ELSE 'solo'
  END;

  v_payment_type := CASE
    WHEN v_payment_method IN ('cash', 'espèces', 'especes') THEN 'cash'
    ELSE COALESCE(NULLIF(NEW.payment_type, ''), 'course')
  END;

  v_transaction_type := COALESCE(NULLIF(NEW.payment_type, ''), 'course_payment');
  v_description := CONCAT('Payment source ', LEFT(NEW.id::text, 8));

  INSERT INTO public.driver_balance_pending (
    driver_id, course_id, gross_amount, solocab_fee, stripe_fee, net_amount, payment_type, status, settlement_id, created_at, settled_at, source_payment_id
  ) VALUES (
    NEW.driver_id, NEW.course_id, v_amount, v_solocab_fee, v_stripe_fee, v_net, v_payment_type, 'pending', NULL, v_event_at, NULL, NEW.id
  )
  ON CONFLICT (source_payment_id)
  DO UPDATE SET
    driver_id = EXCLUDED.driver_id,
    course_id = EXCLUDED.course_id,
    gross_amount = EXCLUDED.gross_amount,
    solocab_fee = EXCLUDED.solocab_fee,
    stripe_fee = EXCLUDED.stripe_fee,
    net_amount = EXCLUDED.net_amount,
    payment_type = EXCLUDED.payment_type,
    created_at = EXCLUDED.created_at;

  INSERT INTO public.solo_admin_ledger (
    course_id, driver_id, fee_amount, fee_type, week_start, status, settlement_id, created_at, settled_at, description, source_payment_id
  ) VALUES (
    NEW.course_id, NEW.driver_id, v_solocab_fee, v_fee_type, v_week_start, 'pending', NULL, v_event_at, NULL, v_description, NEW.id
  )
  ON CONFLICT (source_payment_id)
  DO UPDATE SET
    course_id = EXCLUDED.course_id,
    driver_id = EXCLUDED.driver_id,
    fee_amount = EXCLUDED.fee_amount,
    fee_type = EXCLUDED.fee_type,
    week_start = EXCLUDED.week_start,
    created_at = EXCLUDED.created_at,
    description = EXCLUDED.description;

  INSERT INTO public.stripe_transactions (
    course_id, facture_id, driver_id, stripe_payment_intent_id, stripe_charge_id, stripe_transfer_id, stripe_refund_id, transaction_type, gross_amount, stripe_fee_amount, solocab_fee_amount, net_amount, status, description, created_at, updated_at, source_payment_id
  ) VALUES (
    NEW.course_id, NULL, NEW.driver_id, NEW.stripe_payment_intent_id, NEW.stripe_charge_id, NEW.stripe_transfer_id, NEW.stripe_refund_id, v_transaction_type, v_amount, v_stripe_fee, v_solocab_fee, v_net, NEW.status, v_description, v_event_at, now(), NEW.id
  )
  ON CONFLICT (source_payment_id)
  DO UPDATE SET
    course_id = EXCLUDED.course_id,
    driver_id = EXCLUDED.driver_id,
    stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
    stripe_charge_id = EXCLUDED.stripe_charge_id,
    stripe_transfer_id = EXCLUDED.stripe_transfer_id,
    stripe_refund_id = EXCLUDED.stripe_refund_id,
    transaction_type = EXCLUDED.transaction_type,
    gross_amount = EXCLUDED.gross_amount,
    stripe_fee_amount = EXCLUDED.stripe_fee_amount,
    solocab_fee_amount = EXCLUDED.solocab_fee_amount,
    net_amount = EXCLUDED.net_amount,
    status = EXCLUDED.status,
    description = EXCLUDED.description,
    created_at = EXCLUDED.created_at,
    updated_at = now();

  UPDATE public.courses
  SET
    final_payment_amount = COALESCE(final_payment_amount, v_amount),
    payment_status = CASE WHEN payment_status IS DISTINCT FROM 'paid' THEN 'paid' ELSE payment_status END,
    final_payment_status = CASE WHEN final_payment_status IS DISTINCT FROM 'succeeded' THEN 'succeeded' ELSE final_payment_status END,
    payment_captured_at = COALESCE(payment_captured_at, NEW.captured_at, v_event_at),
    solocab_fee_amount = v_solocab_fee,
    stripe_fee_amount = v_stripe_fee,
    total_fees_amount = v_solocab_fee + v_stripe_fee,
    net_amount_to_driver = v_net
  WHERE id = NEW.course_id;

  RETURN NEW;
END;
$$;