CREATE OR REPLACE FUNCTION public.normalize_payment_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_method text;
  v_type text;
  v_is_cash boolean;
  v_is_revenue boolean;
  v_default_solocab numeric;
  v_recomputed_net numeric;
BEGIN
  v_amount := GREATEST(COALESCE(NEW.captured_amount, NEW.amount, 0), 0);
  v_method := lower(COALESCE(NEW.payment_method, ''));
  v_type := lower(COALESCE(NEW.payment_type, ''));
  v_is_cash := v_method IN ('cash', 'espèces', 'especes');
  v_is_revenue := NEW.status IN ('succeeded', 'captured')
    AND NEW.course_id IS NOT NULL
    AND NEW.driver_id IS NOT NULL
    AND v_type NOT IN ('card_hold', 'reservation_hold', 'bank_hold', 'setup_intent', 'setup');

  IF NEW.status IN ('succeeded', 'captured') THEN
    NEW.captured_amount := COALESCE(NEW.captured_amount, NEW.amount, 0);
    NEW.captured_at := COALESCE(NEW.captured_at, now());
  END IF;

  IF v_is_revenue THEN
    v_default_solocab := CASE
      WHEN v_type LIKE '%spontaneous%' THEN 0.80
      WHEN v_type LIKE '%shared%' THEN 0.25
      ELSE 0.50
    END;

    IF NEW.application_fee_amount IS NULL OR NEW.application_fee_amount = 0 THEN
      NEW.application_fee_amount := LEAST(v_default_solocab, v_amount);
    ELSE
      NEW.application_fee_amount := GREATEST(NEW.application_fee_amount, 0);
    END IF;

    IF NEW.stripe_fee_amount IS NULL
       OR (NEW.stripe_fee_amount = 0 AND NOT v_is_cash AND (NEW.stripe_payment_intent_id IS NOT NULL OR v_method IN ('card', 'stripe')))
    THEN
      NEW.stripe_fee_amount := CASE
        WHEN v_is_cash THEN 0
        ELSE ROUND((v_amount * 0.015 + 0.25)::numeric, 2)
      END;
    ELSE
      NEW.stripe_fee_amount := GREATEST(NEW.stripe_fee_amount, 0);
    END IF;

    v_recomputed_net := GREATEST(v_amount - NEW.application_fee_amount - NEW.stripe_fee_amount, 0);
    IF NEW.net_to_driver IS NULL OR NEW.net_to_driver = v_amount OR NEW.net_to_driver > v_recomputed_net + 0.009 THEN
      NEW.net_to_driver := v_recomputed_net;
    ELSE
      NEW.net_to_driver := GREATEST(NEW.net_to_driver, 0);
    END IF;
  ELSE
    NEW.application_fee_amount := GREATEST(COALESCE(NEW.application_fee_amount, 0), 0);
    NEW.stripe_fee_amount := GREATEST(COALESCE(NEW.stripe_fee_amount, 0), 0);
    NEW.net_to_driver := GREATEST(
      COALESCE(NEW.net_to_driver, v_amount - NEW.application_fee_amount - NEW.stripe_fee_amount),
      0
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_financial_records_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_solocab_fee numeric;
  v_stripe_fee numeric;
  v_net_amount numeric;
  v_existing_id uuid;
  v_event_at timestamptz;
  v_week_start date;
  v_payment_method text;
  v_payment_type text;
  v_fee_type text;
  v_transaction_type text;
  v_gross numeric;
  v_raw_type text;
BEGIN
  IF NEW.status NOT IN ('succeeded', 'captured') THEN
    RETURN NEW;
  END IF;

  IF OLD IS NOT NULL AND OLD.status IN ('succeeded', 'captured') THEN
    RETURN NEW;
  END IF;

  v_raw_type := lower(COALESCE(NEW.payment_type, ''));
  IF v_raw_type IN ('card_hold', 'reservation_hold', 'bank_hold', 'setup_intent', 'setup') THEN
    RETURN NEW;
  END IF;

  v_driver_id := NEW.driver_id;
  IF v_driver_id IS NULL AND NEW.course_id IS NOT NULL THEN
    SELECT driver_id INTO v_driver_id
    FROM public.courses
    WHERE id = NEW.course_id;
  END IF;

  IF v_driver_id IS NULL OR NEW.course_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_payment_method := lower(COALESCE(NEW.payment_method, ''));
  v_gross := GREATEST(COALESCE(NEW.captured_amount, NEW.amount, 0), 0);
  IF v_gross <= 0 THEN
    RETURN NEW;
  END IF;

  v_solocab_fee := GREATEST(COALESCE(NEW.application_fee_amount, 0), 0);
  v_stripe_fee := GREATEST(COALESCE(NEW.stripe_fee_amount, 0), 0);
  v_net_amount := GREATEST(COALESCE(NEW.net_to_driver, v_gross - v_solocab_fee - v_stripe_fee), 0);
  v_event_at := COALESCE(NEW.captured_at, NEW.updated_at, NEW.created_at, now());
  v_week_start := date_trunc('week', v_event_at)::date;

  v_payment_type := CASE
    WHEN v_payment_method IN ('cash', 'espèces', 'especes') THEN 'cash'
    ELSE 'card'
  END;

  v_fee_type := CASE
    WHEN v_payment_type = 'cash' THEN 'cash_commission'
    WHEN v_raw_type LIKE '%spontaneous%' THEN 'spontaneous'
    WHEN v_raw_type LIKE '%shared%' THEN 'shared'
    ELSE 'solo'
  END;

  v_transaction_type := CASE
    WHEN v_raw_type IN ('deposit_payment','final_payment','full_payment','cancellation_fee','refund','partner_transfer','capture','spontaneous_payment','course_payment','course_capture','course','shared_course_payment') THEN v_raw_type
    WHEN v_raw_type IN ('course_recovery','course_final_payment') THEN 'course_payment'
    ELSE 'course_payment'
  END;

  SELECT id INTO v_existing_id
  FROM public.stripe_transactions
  WHERE source_payment_id = NEW.id
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id
    FROM public.stripe_transactions
    WHERE course_id = NEW.course_id AND driver_id = v_driver_id AND source_payment_id IS NULL
    LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.stripe_transactions SET
      source_payment_id = NEW.id,
      stripe_payment_intent_id = COALESCE(NEW.stripe_payment_intent_id, stripe_payment_intent_id),
      stripe_charge_id = COALESCE(NEW.stripe_charge_id, stripe_charge_id),
      stripe_transfer_id = COALESCE(NEW.stripe_transfer_id, stripe_transfer_id),
      gross_amount = v_gross,
      solocab_fee_amount = v_solocab_fee,
      stripe_fee_amount = v_stripe_fee,
      net_amount = v_net_amount,
      transaction_type = v_transaction_type,
      payment_method = CASE WHEN v_payment_type = 'cash' THEN 'cash' ELSE 'stripe' END,
      status = 'succeeded',
      updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.stripe_transactions (
      course_id, driver_id, source_payment_id,
      gross_amount, solocab_fee_amount, stripe_fee_amount, net_amount,
      status, transaction_type, payment_method,
      stripe_payment_intent_id, stripe_charge_id, stripe_transfer_id,
      description
    ) VALUES (
      NEW.course_id, v_driver_id, NEW.id,
      v_gross, v_solocab_fee, v_stripe_fee, v_net_amount,
      'succeeded', v_transaction_type, CASE WHEN v_payment_type = 'cash' THEN 'cash' ELSE 'stripe' END,
      NEW.stripe_payment_intent_id, NEW.stripe_charge_id, NEW.stripe_transfer_id,
      'Paiement #' || LEFT(NEW.id::text, 8)
    );
  END IF;

  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.driver_balance_pending
  WHERE source_payment_id = NEW.id
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id
    FROM public.driver_balance_pending
    WHERE course_id = NEW.course_id AND driver_id = v_driver_id AND source_payment_id IS NULL
    LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.driver_balance_pending SET
      source_payment_id = NEW.id,
      gross_amount = v_gross,
      solocab_fee = v_solocab_fee,
      stripe_fee = v_stripe_fee,
      net_amount = v_net_amount,
      payment_type = v_payment_type,
      updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.driver_balance_pending (
      driver_id, course_id, source_payment_id,
      gross_amount, solocab_fee, stripe_fee, net_amount,
      payment_type, status, created_at
    ) VALUES (
      v_driver_id, NEW.course_id, NEW.id,
      v_gross, v_solocab_fee, v_stripe_fee, v_net_amount,
      v_payment_type, 'pending', v_event_at
    );
  END IF;

  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.solo_admin_ledger
  WHERE source_payment_id = NEW.id
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id
    FROM public.solo_admin_ledger
    WHERE course_id = NEW.course_id AND driver_id = v_driver_id AND source_payment_id IS NULL
    LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.solo_admin_ledger SET
      source_payment_id = NEW.id,
      fee_amount = v_solocab_fee,
      fee_type = v_fee_type,
      week_start = v_week_start,
      description = 'Paiement #' || LEFT(NEW.id::text, 8)
    WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.solo_admin_ledger (
      course_id, driver_id, fee_amount, fee_type, week_start, status, created_at, description, source_payment_id
    ) VALUES (
      NEW.course_id, v_driver_id, v_solocab_fee, v_fee_type, v_week_start, 'pending', v_event_at,
      'Paiement #' || LEFT(NEW.id::text, 8), NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP VIEW IF EXISTS public.driver_settlement_preview;

CREATE VIEW public.driver_settlement_preview
WITH (security_invoker = true) AS
SELECT
  d.id AS driver_id,
  d.company_name,
  d.cash_debt_pending,
  COALESCE(SUM(CASE WHEN dbp.payment_type <> 'cash' THEN dbp.net_amount ELSE 0 END), 0)::numeric(10,2) AS card_to_transfer,
  COALESCE(SUM(CASE WHEN dbp.payment_type = 'cash' THEN dbp.solocab_fee ELSE 0 END), 0)::numeric(10,2) AS cash_fees_owed_this_week,
  COALESCE(SUM(CASE WHEN dbp.payment_type = 'cash' THEN dbp.gross_amount ELSE 0 END), 0)::numeric(10,2) AS cash_collected_this_week,
  COUNT(*) FILTER (WHERE dbp.payment_type <> 'cash') AS card_courses,
  COUNT(*) FILTER (WHERE dbp.payment_type = 'cash') AS cash_courses,
  GREATEST(
    COALESCE(SUM(CASE WHEN dbp.payment_type <> 'cash' THEN dbp.net_amount ELSE 0 END), 0)
    - d.cash_debt_pending
    - COALESCE(SUM(CASE WHEN dbp.payment_type = 'cash' THEN dbp.solocab_fee ELSE 0 END), 0),
    0
  )::numeric(10,2) AS net_to_transfer_estimate,
  d.stripe_connect_account_id,
  d.stripe_connect_charges_enabled,
  COALESCE(SUM(CASE WHEN dbp.payment_type <> 'cash' THEN dbp.gross_amount ELSE 0 END), 0)::numeric(10,2) AS card_gross_pending,
  COALESCE(SUM(CASE WHEN dbp.payment_type <> 'cash' THEN dbp.solocab_fee ELSE 0 END), 0)::numeric(10,2) AS card_solocab_fees_pending,
  COALESCE(SUM(CASE WHEN dbp.payment_type <> 'cash' THEN dbp.stripe_fee ELSE 0 END), 0)::numeric(10,2) AS card_stripe_fees_pending,
  COALESCE(SUM(CASE WHEN dbp.payment_type = 'cash' AND dbp.created_at >= date_trunc('week', now()) THEN dbp.solocab_fee ELSE 0 END), 0)::numeric(10,2) AS cash_fees_owed_current_week,
  COALESCE(SUM(CASE WHEN dbp.payment_type = 'cash' AND dbp.created_at < date_trunc('week', now()) THEN dbp.solocab_fee ELSE 0 END), 0)::numeric(10,2) AS cash_fees_owed_past_pending,
  COALESCE(SUM(CASE WHEN dbp.payment_type = 'cash' AND dbp.created_at >= date_trunc('week', now()) THEN dbp.gross_amount ELSE 0 END), 0)::numeric(10,2) AS cash_collected_current_week,
  COALESCE(SUM(CASE WHEN dbp.payment_type = 'cash' AND dbp.created_at < date_trunc('week', now()) THEN dbp.gross_amount ELSE 0 END), 0)::numeric(10,2) AS cash_collected_past_pending,
  COUNT(*) FILTER (WHERE dbp.payment_type = 'cash' AND dbp.created_at >= date_trunc('week', now())) AS cash_courses_current_week,
  COUNT(*) FILTER (WHERE dbp.payment_type = 'cash' AND dbp.created_at < date_trunc('week', now())) AS cash_courses_past_pending,
  (
    d.cash_debt_pending
    + COALESCE(SUM(CASE WHEN dbp.payment_type = 'cash' THEN dbp.solocab_fee ELSE 0 END), 0)
  )::numeric(10,2) AS total_cash_debt_to_recover
FROM public.drivers d
LEFT JOIN public.driver_balance_pending dbp
  ON dbp.driver_id = d.id AND dbp.status = 'pending'
GROUP BY d.id, d.company_name, d.cash_debt_pending,
         d.stripe_connect_account_id, d.stripe_connect_charges_enabled;

GRANT SELECT ON public.driver_settlement_preview TO authenticated, service_role;