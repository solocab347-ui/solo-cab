
-- Add payment_method to stripe_transactions
ALTER TABLE public.stripe_transactions 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'stripe';

-- Backfill from payments table
UPDATE public.stripe_transactions st
SET payment_method = p.payment_method
FROM public.payments p
WHERE st.source_payment_id = p.id
  AND p.payment_method IS NOT NULL;

-- Update the sync trigger to include payment_method
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
  v_existing_txn_id uuid;
  v_existing_balance_id uuid;
  v_existing_ledger_id uuid;
BEGIN
  -- Only process when payment reaches succeeded or captured status
  IF NEW.status NOT IN ('succeeded', 'captured') THEN
    RETURN NEW;
  END IF;

  -- Skip if old status was already succeeded/captured (avoid double processing)
  IF OLD IS NOT NULL AND OLD.status IN ('succeeded', 'captured') THEN
    RETURN NEW;
  END IF;

  -- Get driver_id from the course
  SELECT driver_id INTO v_driver_id
  FROM courses
  WHERE id = NEW.course_id;

  IF v_driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate fees
  v_solocab_fee := COALESCE(NEW.application_fee_amount, 0.50);
  v_stripe_fee := COALESCE(NEW.stripe_fee_amount, 0);
  v_net_amount := COALESCE(NEW.captured_amount, NEW.amount, 0) - v_solocab_fee - v_stripe_fee;
  IF v_net_amount < 0 THEN v_net_amount := 0; END IF;

  -- 1. Upsert stripe_transactions
  SELECT id INTO v_existing_txn_id FROM stripe_transactions WHERE source_payment_id = NEW.id;
  IF v_existing_txn_id IS NULL THEN
    INSERT INTO stripe_transactions (
      course_id, driver_id, source_payment_id,
      gross_amount, solocab_fee_amount, stripe_fee_amount, net_amount,
      status, transaction_type, payment_method,
      stripe_payment_intent_id, stripe_charge_id, stripe_transfer_id
    ) VALUES (
      NEW.course_id, v_driver_id, NEW.id,
      COALESCE(NEW.captured_amount, NEW.amount, 0), v_solocab_fee, v_stripe_fee, v_net_amount,
      'completed', COALESCE(NEW.payment_type, 'course_payment'), COALESCE(NEW.payment_method, 'stripe'),
      NEW.stripe_payment_intent_id, NEW.stripe_charge_id, NEW.stripe_transfer_id
    );
  END IF;

  -- 2. Upsert driver_balance_pending
  SELECT id INTO v_existing_balance_id FROM driver_balance_pending WHERE source_payment_id = NEW.id;
  IF v_existing_balance_id IS NULL THEN
    INSERT INTO driver_balance_pending (
      driver_id, course_id, source_payment_id,
      gross_amount, solocab_fee, stripe_fee, net_amount,
      payment_type, status
    ) VALUES (
      v_driver_id, NEW.course_id, NEW.id,
      COALESCE(NEW.captured_amount, NEW.amount, 0), v_solocab_fee, v_stripe_fee, v_net_amount,
      COALESCE(NEW.payment_method, 'stripe'), 'pending'
    );
  END IF;

  -- 3. Upsert solo_admin_ledger
  SELECT id INTO v_existing_ledger_id FROM solo_admin_ledger WHERE source_payment_id = NEW.id;
  IF v_existing_ledger_id IS NULL THEN
    INSERT INTO solo_admin_ledger (
      driver_id, course_id, source_payment_id,
      fee_type, amount, status
    ) VALUES (
      v_driver_id, NEW.course_id, NEW.id,
      'platform_fee', v_solocab_fee, 
      CASE WHEN COALESCE(NEW.payment_method, 'stripe') = 'cash' THEN 'pending_collection' ELSE 'collected' END
    );
  END IF;

  RETURN NEW;
END;
$$;
