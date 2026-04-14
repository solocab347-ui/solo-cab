
-- 1. Update the financial trigger to handle all fee types
CREATE OR REPLACE FUNCTION public.populate_financial_records_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_gross numeric;
  v_solocab_fee numeric;
  v_stripe_fee numeric;
  v_net numeric;
  v_week_start date;
  v_already_exists boolean;
  v_payment_method text;
  v_is_cash boolean;
  v_is_shared boolean;
  v_is_spontaneous boolean;
  v_fee_type text;
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

  -- Detect if this is a shared course (receiver side)
  SELECT EXISTS(
    SELECT 1 FROM shared_courses 
    WHERE course_id = NEW.id 
    AND status IN ('accepted', 'completed')
  ) INTO v_is_shared;

  -- Detect spontaneous payment (origin_type = 'spontaneous' or 'encaissement')
  v_is_spontaneous := lower(COALESCE(NEW.origin_type, '')) IN ('spontaneous', 'encaissement', 'spontaneous_payment', 'quick_collect');

  -- Determine fee based on type
  IF v_is_spontaneous THEN
    v_solocab_fee := 0.80;
    v_fee_type := 'spontaneous_commission';
  ELSIF v_is_shared THEN
    v_solocab_fee := 0.25;
    v_fee_type := 'shared_commission';
  ELSE
    v_solocab_fee := 0.50;
    v_fee_type := CASE WHEN v_is_cash THEN 'cash_commission' ELSE 'solo' END;
  END IF;

  -- Cap fee at gross
  v_solocab_fee := LEAST(v_solocab_fee, v_gross);

  -- Calculate Stripe fees
  IF v_is_cash THEN
    v_stripe_fee := 0;
  ELSE
    v_stripe_fee := ROUND((v_gross * 0.014 + 0.25)::numeric, 2);
  END IF;

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
  VALUES (NEW.id, NEW.driver_id, v_solocab_fee, v_fee_type,
          v_week_start, 'pending', 
          CASE 
            WHEN v_is_spontaneous THEN 'Encaissement spontané #' 
            WHEN v_is_shared THEN 'Course partagée #'
            ELSE 'Commission course #'
          END || LEFT(NEW.id::text, 8));

  -- 3. Stripe transactions
  INSERT INTO stripe_transactions (course_id, driver_id, transaction_type, gross_amount, stripe_fee_amount, solocab_fee_amount, net_amount, status, payment_method, description)
  VALUES (NEW.id, NEW.driver_id, 
          CASE 
            WHEN v_is_spontaneous THEN 'spontaneous_payment'
            WHEN v_is_shared THEN 'shared_course_payment'
            ELSE 'course_payment'
          END,
          v_gross, v_stripe_fee, v_solocab_fee, v_net, 'succeeded',
          CASE WHEN v_is_cash THEN 'cash' ELSE 'stripe' END,
          CASE 
            WHEN v_is_spontaneous THEN 'Encaissement #'
            WHEN v_is_shared THEN 'Partage #'
            ELSE 'Course #'
          END || LEFT(NEW.id::text, 8));

  RETURN NEW;
END;
$$;

-- 2. Ensure the trigger is attached to courses
DROP TRIGGER IF EXISTS trg_populate_financial_records ON courses;
CREATE TRIGGER trg_populate_financial_records
  AFTER UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION populate_financial_records_on_completion();

-- 3. Create stripe_anomalies table for admin monitoring
CREATE TABLE IF NOT EXISTS public.stripe_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  anomaly_type text NOT NULL,
  description text,
  expected_value numeric,
  actual_value numeric,
  severity text NOT NULL DEFAULT 'warning',
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stripe anomalies"
  ON public.stripe_anomalies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_stripe_anomalies_driver ON public.stripe_anomalies(driver_id);
CREATE INDEX IF NOT EXISTS idx_stripe_anomalies_unresolved ON public.stripe_anomalies(is_resolved) WHERE NOT is_resolved;
