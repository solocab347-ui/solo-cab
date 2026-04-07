
-- Trigger function: on course completion, populate financial tables
CREATE OR REPLACE FUNCTION public.populate_financial_records_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gross numeric;
  v_solocab_fee numeric := 0.80;
  v_stripe_fee numeric;
  v_net numeric;
  v_week_start date;
  v_already_exists boolean;
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

  -- Calculate fees
  -- Stripe ~1.4% + 0.25€
  v_stripe_fee := ROUND((v_gross * 0.014 + 0.25)::numeric, 2);
  -- SoloCab fee capped at gross
  v_solocab_fee := LEAST(v_solocab_fee, v_gross);
  -- Net to driver
  v_net := GREATEST(v_gross - v_stripe_fee - v_solocab_fee, 0);

  -- Week start (Monday)
  v_week_start := date_trunc('week', NOW())::date;

  -- 1. Driver balance pending
  INSERT INTO driver_balance_pending (driver_id, course_id, gross_amount, solocab_fee, stripe_fee, net_amount, payment_type, status)
  VALUES (NEW.driver_id, NEW.id, v_gross, v_solocab_fee, v_stripe_fee, v_net, 'course', 'pending');

  -- 2. Solo admin ledger
  INSERT INTO solo_admin_ledger (course_id, driver_id, fee_amount, fee_type, week_start, status, description)
  VALUES (NEW.id, NEW.driver_id, v_solocab_fee, 'solo', v_week_start, 'pending', 'Commission course #' || LEFT(NEW.id::text, 8));

  -- 3. Stripe transactions
  INSERT INTO stripe_transactions (course_id, driver_id, transaction_type, gross_amount, stripe_fee_amount, solocab_fee_amount, net_amount, status, description)
  VALUES (NEW.id, NEW.driver_id, 'full_payment', v_gross, v_stripe_fee, v_solocab_fee, v_net, 'succeeded', 'Course ' || LEFT(NEW.id::text, 8));

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_populate_financial_on_completion ON courses;
CREATE TRIGGER trg_populate_financial_on_completion
  AFTER INSERT OR UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION populate_financial_records_on_completion();

-- Backfill existing completed courses that have no financial records
INSERT INTO driver_balance_pending (driver_id, course_id, gross_amount, solocab_fee, stripe_fee, net_amount, payment_type, status)
SELECT 
  c.driver_id,
  c.id,
  COALESCE(c.final_payment_amount, 0),
  LEAST(0.80, COALESCE(c.final_payment_amount, 0)),
  ROUND((COALESCE(c.final_payment_amount, 0) * 0.014 + 0.25)::numeric, 2),
  GREATEST(COALESCE(c.final_payment_amount, 0) - ROUND((COALESCE(c.final_payment_amount, 0) * 0.014 + 0.25)::numeric, 2) - LEAST(0.80, COALESCE(c.final_payment_amount, 0)), 0),
  'course',
  'pending'
FROM courses c
WHERE c.status = 'completed'
  AND COALESCE(c.final_payment_amount, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM driver_balance_pending dbp WHERE dbp.course_id = c.id);

INSERT INTO solo_admin_ledger (course_id, driver_id, fee_amount, fee_type, week_start, status, description)
SELECT 
  c.id,
  c.driver_id,
  LEAST(0.80, COALESCE(c.final_payment_amount, 0)),
  'solo',
  date_trunc('week', c.updated_at)::date,
  'pending',
  'Commission course #' || LEFT(c.id::text, 8)
FROM courses c
WHERE c.status = 'completed'
  AND COALESCE(c.final_payment_amount, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM solo_admin_ledger sal WHERE sal.course_id = c.id);

INSERT INTO stripe_transactions (course_id, driver_id, transaction_type, gross_amount, stripe_fee_amount, solocab_fee_amount, net_amount, status, description)
SELECT 
  c.id,
  c.driver_id,
  'full_payment',
  COALESCE(c.final_payment_amount, 0),
  ROUND((COALESCE(c.final_payment_amount, 0) * 0.014 + 0.25)::numeric, 2),
  LEAST(0.80, COALESCE(c.final_payment_amount, 0)),
  GREATEST(COALESCE(c.final_payment_amount, 0) - ROUND((COALESCE(c.final_payment_amount, 0) * 0.014 + 0.25)::numeric, 2) - LEAST(0.80, COALESCE(c.final_payment_amount, 0)), 0),
  'succeeded',
  'Course ' || LEFT(c.id::text, 8)
FROM courses c
WHERE c.status = 'completed'
  AND COALESCE(c.final_payment_amount, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM stripe_transactions st WHERE st.course_id = c.id);
