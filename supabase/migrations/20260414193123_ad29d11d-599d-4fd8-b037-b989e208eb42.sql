
CREATE OR REPLACE FUNCTION public.populate_financial_records_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;
  IF OLD IS NOT NULL AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(SELECT 1 FROM driver_balance_pending WHERE course_id = NEW.id) INTO v_already_exists;
  IF v_already_exists THEN
    RETURN NEW;
  END IF;

  v_gross := COALESCE(NEW.final_payment_amount, 0);
  IF v_gross <= 0 THEN
    RETURN NEW;
  END IF;

  v_payment_method := lower(COALESCE(NEW.payment_method::text, ''));
  v_is_cash := v_payment_method IN ('cash', 'espèces', 'especes');

  SELECT EXISTS(
    SELECT 1 FROM shared_courses 
    WHERE course_id = NEW.id 
    AND status IN ('accepted', 'completed')
  ) INTO v_is_shared;

  v_is_spontaneous := lower(COALESCE(NEW.origin_type, '')) IN ('spontaneous', 'encaissement', 'spontaneous_payment', 'quick_collect');

  -- Fee type must match validator: 'solo', 'shared', 'spontaneous', 'cash_commission'
  IF v_is_spontaneous THEN
    v_solocab_fee := 0.80;
    v_fee_type := 'spontaneous';
  ELSIF v_is_shared THEN
    v_solocab_fee := 0.25;
    v_fee_type := 'shared';
  ELSE
    v_solocab_fee := 0.50;
    v_fee_type := CASE WHEN v_is_cash THEN 'cash_commission' ELSE 'solo' END;
  END IF;

  v_solocab_fee := LEAST(v_solocab_fee, v_gross);

  IF v_is_cash THEN
    v_stripe_fee := 0;
  ELSE
    v_stripe_fee := ROUND((v_gross * 0.014 + 0.25)::numeric, 2);
  END IF;

  v_net := GREATEST(v_gross - v_stripe_fee - v_solocab_fee, 0);
  v_week_start := date_trunc('week', NOW())::date;

  INSERT INTO driver_balance_pending (driver_id, course_id, gross_amount, solocab_fee, stripe_fee, net_amount, payment_type, status)
  VALUES (NEW.driver_id, NEW.id, v_gross, v_solocab_fee, v_stripe_fee, v_net,
          CASE WHEN v_is_cash THEN 'cash' ELSE 'card' END, 'pending');

  INSERT INTO solo_admin_ledger (course_id, driver_id, fee_amount, fee_type, week_start, status, description)
  VALUES (NEW.id, NEW.driver_id, v_solocab_fee, v_fee_type,
          v_week_start, 'pending', 
          CASE 
            WHEN v_is_spontaneous THEN 'Encaissement spontané #' 
            WHEN v_is_shared THEN 'Course partagée #'
            ELSE 'Commission course #'
          END || LEFT(NEW.id::text, 8));

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
