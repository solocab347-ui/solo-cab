
-- ============================================================
-- STEP 1: Fix the sync trigger to detect legacy records and upgrade them
-- ============================================================
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
  v_fee_type text;
  v_gross numeric;
BEGIN
  IF NEW.status NOT IN ('succeeded', 'captured') THEN
    RETURN NEW;
  END IF;

  IF OLD IS NOT NULL AND OLD.status IN ('succeeded', 'captured') THEN
    RETURN NEW;
  END IF;

  SELECT driver_id INTO v_driver_id
  FROM courses
  WHERE id = NEW.course_id;

  IF v_driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_payment_method := lower(COALESCE(NEW.payment_method, ''));
  v_solocab_fee := COALESCE(NEW.application_fee_amount, 0.50);
  v_stripe_fee := COALESCE(NEW.stripe_fee_amount, 0);
  v_gross := COALESCE(NEW.captured_amount, NEW.amount, 0);
  v_net_amount := GREATEST(v_gross - v_solocab_fee - v_stripe_fee, 0);

  v_event_at := COALESCE(NEW.captured_at, NEW.updated_at, NEW.created_at, now());
  v_week_start := date_trunc('week', v_event_at)::date;

  v_fee_type := CASE
    WHEN v_payment_method IN ('cash', 'espèces', 'especes') THEN 'cash_commission'
    ELSE 'solo'
  END;

  -- 1. stripe_transactions: check by source_payment_id OR by course_id (legacy)
  SELECT id INTO v_existing_id FROM stripe_transactions WHERE source_payment_id = NEW.id LIMIT 1;
  IF v_existing_id IS NULL THEN
    -- Check for legacy record (created by populate_financial_records_on_completion with NULL source_payment_id)
    SELECT id INTO v_existing_id FROM stripe_transactions 
    WHERE course_id = NEW.course_id AND driver_id = v_driver_id AND source_payment_id IS NULL
    LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      -- Upgrade legacy record with payment metadata
      UPDATE stripe_transactions SET
        source_payment_id = NEW.id,
        stripe_payment_intent_id = COALESCE(NEW.stripe_payment_intent_id, stripe_payment_intent_id),
        stripe_charge_id = COALESCE(NEW.stripe_charge_id, stripe_charge_id),
        stripe_transfer_id = COALESCE(NEW.stripe_transfer_id, stripe_transfer_id),
        gross_amount = v_gross,
        solocab_fee_amount = v_solocab_fee,
        stripe_fee_amount = v_stripe_fee,
        net_amount = v_net_amount,
        updated_at = now()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO stripe_transactions (
        course_id, driver_id, source_payment_id,
        gross_amount, solocab_fee_amount, stripe_fee_amount, net_amount,
        status, transaction_type, payment_method,
        stripe_payment_intent_id, stripe_charge_id, stripe_transfer_id
      ) VALUES (
        NEW.course_id, v_driver_id, NEW.id,
        v_gross, v_solocab_fee, v_stripe_fee, v_net_amount,
        'succeeded', COALESCE(NEW.payment_type, 'course_payment'), COALESCE(NEW.payment_method, 'stripe'),
        NEW.stripe_payment_intent_id, NEW.stripe_charge_id, NEW.stripe_transfer_id
      );
    END IF;
  END IF;

  -- 2. driver_balance_pending: check by source_payment_id OR by course_id (legacy)
  v_existing_id := NULL;
  SELECT id INTO v_existing_id FROM driver_balance_pending WHERE source_payment_id = NEW.id LIMIT 1;
  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id FROM driver_balance_pending 
    WHERE course_id = NEW.course_id AND driver_id = v_driver_id AND source_payment_id IS NULL
    LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      UPDATE driver_balance_pending SET
        source_payment_id = NEW.id,
        gross_amount = v_gross,
        solocab_fee = v_solocab_fee,
        stripe_fee = v_stripe_fee,
        net_amount = v_net_amount,
        updated_at = now()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO driver_balance_pending (
        driver_id, course_id, source_payment_id,
        gross_amount, solocab_fee, stripe_fee, net_amount,
        payment_type, status, created_at
      ) VALUES (
        v_driver_id, NEW.course_id, NEW.id,
        v_gross, v_solocab_fee, v_stripe_fee, v_net_amount,
        CASE WHEN v_payment_method IN ('cash', 'espèces', 'especes') THEN 'cash' ELSE COALESCE(NULLIF(NEW.payment_type, ''), 'course') END,
        'pending', v_event_at
      );
    END IF;
  END IF;

  -- 3. solo_admin_ledger: check by source_payment_id OR by course_id (legacy)
  v_existing_id := NULL;
  SELECT id INTO v_existing_id FROM solo_admin_ledger WHERE source_payment_id = NEW.id LIMIT 1;
  IF v_existing_id IS NULL THEN
    SELECT id INTO v_existing_id FROM solo_admin_ledger 
    WHERE course_id = NEW.course_id AND driver_id = v_driver_id AND source_payment_id IS NULL
    LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      UPDATE solo_admin_ledger SET
        source_payment_id = NEW.id,
        fee_amount = v_solocab_fee,
        updated_at = now()
      WHERE id = v_existing_id;
    ELSE
      INSERT INTO solo_admin_ledger (
        driver_id, course_id, source_payment_id,
        fee_type, fee_amount, week_start, status, created_at
      ) VALUES (
        v_driver_id, NEW.course_id, NEW.id,
        v_fee_type, v_solocab_fee, v_week_start,
        'pending', v_event_at
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 2: Clean up existing duplicates (keep oldest, delete newer)
-- ============================================================

-- Clean driver_balance_pending duplicates
DELETE FROM driver_balance_pending
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY course_id, driver_id ORDER BY created_at ASC) as rn
    FROM driver_balance_pending
  ) ranked WHERE rn > 1
);

-- Clean stripe_transactions duplicates
DELETE FROM stripe_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY course_id, driver_id ORDER BY created_at ASC) as rn
    FROM stripe_transactions
  ) ranked WHERE rn > 1
);

-- Clean solo_admin_ledger duplicates
DELETE FROM solo_admin_ledger
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY course_id, driver_id ORDER BY created_at ASC) as rn
    FROM solo_admin_ledger
  ) ranked WHERE rn > 1
);

-- ============================================================
-- STEP 3: Add unique constraints to prevent future duplicates
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_balance_pending_course_driver_unique
ON driver_balance_pending (course_id, driver_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_transactions_course_driver_unique
ON stripe_transactions (course_id, driver_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_solo_admin_ledger_course_driver_unique
ON solo_admin_ledger (course_id, driver_id);
