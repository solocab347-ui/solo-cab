
-- Fix the populate_financial_records_on_completion function
CREATE OR REPLACE FUNCTION public.populate_financial_records_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_gross numeric;
  v_solocab_fee numeric := 0.50;
  v_stripe_fee numeric;
  v_net numeric;
  v_week_start date;
  v_already_exists boolean;
  v_payment_method text;
  v_is_cash boolean;
BEGIN
  -- Only fire when status changes to 'completed'
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF OLD IS NOT NULL AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Check if already recorded
  SELECT EXISTS(SELECT 1 FROM driver_balance_pending WHERE course_id = NEW.id) INTO v_already_exists;
  IF v_already_exists THEN
    RETURN NEW;
  END IF;

  -- Determine gross amount
  v_gross := COALESCE(NEW.final_payment_amount, 0);
  IF v_gross <= 0 THEN
    RETURN NEW;
  END IF;

  -- Detect payment method
  v_payment_method := lower(COALESCE(NEW.payment_method::text, ''));
  v_is_cash := v_payment_method IN ('cash', 'espèces', 'especes');

  -- Calculate fees
  IF v_is_cash THEN
    -- Cash: no Stripe fees, only SoloCab fee
    v_stripe_fee := 0;
  ELSE
    -- Card: Stripe ~1.4% + 0.25€
    v_stripe_fee := ROUND((v_gross * 0.014 + 0.25)::numeric, 2);
  END IF;

  -- SoloCab fee always 0.50€, capped at gross
  v_solocab_fee := LEAST(v_solocab_fee, v_gross);
  -- Net to driver
  v_net := GREATEST(v_gross - v_stripe_fee - v_solocab_fee, 0);

  -- Week start (Monday)
  v_week_start := date_trunc('week', NOW())::date;

  -- 1. Driver balance pending
  INSERT INTO driver_balance_pending (driver_id, course_id, gross_amount, solocab_fee, stripe_fee, net_amount, payment_type, status)
  VALUES (NEW.driver_id, NEW.id, v_gross, v_solocab_fee, v_stripe_fee, v_net,
          CASE WHEN v_is_cash THEN 'cash' ELSE 'card' END, 'pending');

  -- 2. Solo admin ledger
  INSERT INTO solo_admin_ledger (course_id, driver_id, fee_amount, fee_type, week_start, status, description)
  VALUES (NEW.id, NEW.driver_id, v_solocab_fee,
          CASE WHEN v_is_cash THEN 'cash_commission' ELSE 'solo' END,
          v_week_start, 'pending', 'Commission course #' || LEFT(NEW.id::text, 8));

  -- 3. Stripe transactions
  INSERT INTO stripe_transactions (course_id, driver_id, transaction_type, gross_amount, stripe_fee_amount, solocab_fee_amount, net_amount, status, payment_method, description)
  VALUES (NEW.id, NEW.driver_id, 'course_payment', v_gross, v_stripe_fee, v_solocab_fee, v_net, 'succeeded',
          CASE WHEN v_is_cash THEN 'cash' ELSE 'stripe' END,
          'Course ' || LEFT(NEW.id::text, 8));

  RETURN NEW;
END;
$$;

-- Now fix the existing corrupted data for Qasim's course
-- The course 60f84b8b was recorded with wrong fee (0.80 instead of 0.50) and wrong payment_type
UPDATE driver_balance_pending 
SET solocab_fee = 0.50, 
    stripe_fee = 0.00, 
    net_amount = gross_amount - 0.50,
    payment_type = 'cash'
WHERE course_id = '60f84b8b-ea24-43bc-b99d-9b28ce7e54e8';

-- Fix stripe_transactions for same course
UPDATE stripe_transactions 
SET solocab_fee_amount = 0.50, 
    stripe_fee_amount = 0, 
    net_amount = gross_amount - 0.50,
    payment_method = 'cash',
    transaction_type = 'course_payment'
WHERE course_id = '60f84b8b-ea24-43bc-b99d-9b28ce7e54e8';

-- Fix solo_admin_ledger
UPDATE solo_admin_ledger 
SET fee_amount = 0.50,
    fee_type = 'cash_commission'
WHERE course_id = '60f84b8b-ea24-43bc-b99d-9b28ce7e54e8';
