ALTER TABLE public.driver_balance_pending
ADD COLUMN IF NOT EXISTS source_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL;

ALTER TABLE public.solo_admin_ledger
ADD COLUMN IF NOT EXISTS source_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL;

ALTER TABLE public.stripe_transactions
ADD COLUMN IF NOT EXISTS source_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_balance_pending_source_payment_id
ON public.driver_balance_pending(source_payment_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_solo_admin_ledger_source_payment_id
ON public.solo_admin_ledger(source_payment_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_transactions_source_payment_id
ON public.stripe_transactions(source_payment_id);

DROP TRIGGER IF EXISTS trg_populate_financial_on_completion ON public.courses;

CREATE OR REPLACE FUNCTION public.normalize_payment_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
BEGIN
  v_amount := GREATEST(COALESCE(NEW.captured_amount, NEW.amount, 0), 0);

  IF NEW.status IN ('succeeded', 'captured') THEN
    NEW.captured_amount := COALESCE(NEW.captured_amount, NEW.amount, 0);
    NEW.captured_at := COALESCE(NEW.captured_at, now());
  END IF;

  NEW.application_fee_amount := GREATEST(COALESCE(NEW.application_fee_amount, 0), 0);
  NEW.stripe_fee_amount := GREATEST(COALESCE(NEW.stripe_fee_amount, 0), 0);
  NEW.net_to_driver := GREATEST(
    COALESCE(NEW.net_to_driver, v_amount - NEW.application_fee_amount - NEW.stripe_fee_amount),
    0
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_payment_financials ON public.payments;
CREATE TRIGGER trg_normalize_payment_financials
BEFORE INSERT OR UPDATE OF status, amount, captured_amount, application_fee_amount, stripe_fee_amount, net_to_driver, captured_at
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.normalize_payment_financials();

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
    driver_id,
    course_id,
    gross_amount,
    solocab_fee,
    stripe_fee,
    net_amount,
    payment_type,
    status,
    settlement_id,
    created_at,
    settled_at,
    source_payment_id
  ) VALUES (
    NEW.driver_id,
    NEW.course_id,
    v_amount,
    v_solocab_fee,
    v_stripe_fee,
    v_net,
    v_payment_type,
    'pending',
    NULL,
    v_event_at,
    NULL,
    NEW.id
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
    course_id,
    driver_id,
    fee_amount,
    fee_type,
    week_start,
    status,
    settlement_id,
    created_at,
    settled_at,
    description,
    source_payment_id
  ) VALUES (
    NEW.course_id,
    NEW.driver_id,
    v_solocab_fee,
    v_fee_type,
    v_week_start,
    'pending',
    NULL,
    v_event_at,
    NULL,
    v_description,
    NEW.id
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
    course_id,
    facture_id,
    driver_id,
    stripe_payment_intent_id,
    stripe_charge_id,
    stripe_transfer_id,
    stripe_refund_id,
    transaction_type,
    gross_amount,
    stripe_fee_amount,
    solocab_fee_amount,
    net_amount,
    status,
    description,
    created_at,
    updated_at,
    source_payment_id
  ) VALUES (
    NEW.course_id,
    NULL,
    NEW.driver_id,
    NEW.stripe_payment_intent_id,
    NEW.stripe_charge_id,
    NEW.stripe_transfer_id,
    NEW.stripe_refund_id,
    v_transaction_type,
    v_amount,
    v_stripe_fee,
    v_solocab_fee,
    v_net,
    NEW.status,
    v_description,
    v_event_at,
    now(),
    NEW.id
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

DROP TRIGGER IF EXISTS trg_sync_financial_records_from_payment ON public.payments;
CREATE TRIGGER trg_sync_financial_records_from_payment
AFTER INSERT OR UPDATE OF status, amount, captured_amount, application_fee_amount, stripe_fee_amount, net_to_driver, payment_method, payment_type, captured_at, stripe_payment_intent_id, stripe_charge_id, stripe_transfer_id, stripe_refund_id
ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_financial_records_from_payment();

CREATE OR REPLACE FUNCTION public.get_admin_finance_stats(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result json;
  v_today_start timestamptz := date_trunc('day', now());
  v_today_end timestamptz := v_today_start + interval '1 day';
  v_week_start timestamptz := date_trunc('week', now());
  v_7d_ago timestamptz := now() - interval '7 days';
  v_month_start timestamptz := date_trunc('month', now());
  v_period_start timestamptz := COALESCE(p_start, v_week_start);
  v_period_end timestamptz := COALESCE(p_end, now());
BEGIN
  SELECT json_build_object(
    'total_drivers', (SELECT count(*) FROM public.drivers WHERE is_demo_account = false),
    'pending_drivers', (SELECT count(*) FROM public.drivers WHERE is_demo_account = false AND status = 'pending'),
    'active_today', (
      SELECT count(DISTINCT c.driver_id)
      FROM public.courses c
      WHERE c.updated_at >= v_today_start
        AND c.updated_at < v_today_end
        AND c.status IN ('completed', 'in_progress', 'accepted')
    ),
    'new_drivers_7d', (
      SELECT count(*)
      FROM public.drivers
      WHERE is_demo_account = false
        AND created_at >= v_7d_ago
    ),
    'courses_today', (
      SELECT count(*)
      FROM public.courses
      WHERE created_at >= v_today_start
        AND created_at < v_today_end
    ),
    'courses_in_progress', (SELECT count(*) FROM public.courses WHERE status = 'in_progress'),
    'courses_completed_today', (
      SELECT count(*)
      FROM public.courses
      WHERE status = 'completed'
        AND updated_at >= v_today_start
        AND updated_at < v_today_end
    ),
    'courses_shared_today', 0,
    'ca_today', COALESCE((
      SELECT sum(COALESCE(p.captured_amount, p.amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) >= v_today_start
        AND COALESCE(p.captured_at, p.created_at) < v_today_end
    ), 0),
    'fees_today', COALESCE((
      SELECT sum(COALESCE(p.application_fee_amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) >= v_today_start
        AND COALESCE(p.captured_at, p.created_at) < v_today_end
    ), 0),
    'stripe_fees_today', COALESCE((
      SELECT sum(COALESCE(p.stripe_fee_amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) >= v_today_start
        AND COALESCE(p.captured_at, p.created_at) < v_today_end
    ), 0),
    'net_drivers_today', COALESCE((
      SELECT sum(GREATEST(COALESCE(p.net_to_driver, 0), 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) >= v_today_start
        AND COALESCE(p.captured_at, p.created_at) < v_today_end
    ), 0),
    'ca_week', COALESCE((
      SELECT sum(COALESCE(p.captured_amount, p.amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) >= v_week_start
    ), 0),
    'fees_week', COALESCE((
      SELECT sum(COALESCE(p.application_fee_amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) >= v_week_start
    ), 0),
    'stripe_fees_week', COALESCE((
      SELECT sum(COALESCE(p.stripe_fee_amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) >= v_week_start
    ), 0),
    'net_drivers_week', COALESCE((
      SELECT sum(GREATEST(COALESCE(p.net_to_driver, 0), 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) >= v_week_start
    ), 0),
    'pending_settlement', COALESCE((
      SELECT sum(dbp.net_amount)
      FROM public.driver_balance_pending dbp
      WHERE dbp.status = 'pending'
    ), 0),
    'pending_admin_fees', COALESCE((
      SELECT sum(sal.fee_amount)
      FROM public.solo_admin_ledger sal
      WHERE sal.status = 'pending'
    ), 0),
    'drivers_to_pay', (
      SELECT count(DISTINCT dbp.driver_id)
      FROM public.driver_balance_pending dbp
      WHERE dbp.status = 'pending'
        AND dbp.net_amount > 0
    ),
    'ca_month', COALESCE((
      SELECT sum(COALESCE(p.captured_amount, p.amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) >= v_month_start
    ), 0),
    'fees_month', COALESCE((
      SELECT sum(COALESCE(p.application_fee_amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) >= v_month_start
    ), 0),
    'stripe_fees_month', COALESCE((
      SELECT sum(COALESCE(p.stripe_fee_amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) >= v_month_start
    ), 0),
    'disputes_open', 0,
    'payments_error', (
      SELECT count(*)
      FROM public.payments p
      WHERE p.status IN ('failed', 'canceled')
        AND COALESCE(p.failed_at, p.canceled_at, p.updated_at, p.created_at) >= v_7d_ago
    ),
    'drivers_no_stripe', (
      SELECT count(*)
      FROM public.drivers d
      WHERE d.is_demo_account = false
        AND (d.stripe_connect_account_id IS NULL OR d.stripe_connect_charges_enabled = false)
    ),
    'courses_no_payment', (
      SELECT count(*)
      FROM public.courses c
      WHERE c.status = 'completed'
        AND NOT EXISTS (
          SELECT 1
          FROM public.payments p
          WHERE p.course_id = c.id
            AND p.status IN ('succeeded', 'captured')
        )
    ),
    'courses_period', (
      SELECT count(DISTINCT p.course_id)
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) BETWEEN v_period_start AND v_period_end
    ),
    'ca_period', COALESCE((
      SELECT sum(COALESCE(p.captured_amount, p.amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) BETWEEN v_period_start AND v_period_end
    ), 0),
    'fees_period', COALESCE((
      SELECT sum(COALESCE(p.application_fee_amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) BETWEEN v_period_start AND v_period_end
    ), 0),
    'stripe_fees_period', COALESCE((
      SELECT sum(COALESCE(p.stripe_fee_amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) BETWEEN v_period_start AND v_period_end
    ), 0),
    'net_drivers_period', COALESCE((
      SELECT sum(GREATEST(COALESCE(p.net_to_driver, 0), 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) BETWEEN v_period_start AND v_period_end
    ), 0),
    'courses_cancelled_period', (
      SELECT count(*)
      FROM public.courses c
      WHERE c.status = 'cancelled'
        AND c.updated_at BETWEEN v_period_start AND v_period_end
    ),
    'courses_shared_period', 0,
    'spontaneous_period', (
      SELECT count(*)
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND p.payment_type = 'spontaneous'
        AND COALESCE(p.captured_at, p.created_at) BETWEEN v_period_start AND v_period_end
    ),
    'drivers_active_period', (
      SELECT count(DISTINCT p.driver_id)
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) BETWEEN v_period_start AND v_period_end
    ),
    'period_start', v_period_start,
    'period_end', v_period_end
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_drivers_finance(
  p_week_start date DEFAULT NULL,
  p_period_end date DEFAULT NULL
)
RETURNS TABLE(
  driver_id uuid,
  driver_name text,
  company_name text,
  stripe_account_id text,
  stripe_active boolean,
  courses_count bigint,
  gross_total numeric,
  solocab_fees numeric,
  net_total numeric,
  payment_status text,
  pending_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  ws date := COALESCE(p_week_start, date_trunc('week', now())::date);
  we date := COALESCE(p_period_end, (ws + 6));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    d.id AS driver_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'N/A') AS driver_name,
    d.company_name,
    d.stripe_connect_account_id AS stripe_account_id,
    COALESCE(d.stripe_connect_charges_enabled, false) AS stripe_active,
    COALESCE(pay.cnt, 0) AS courses_count,
    COALESCE(pay.gross, 0) AS gross_total,
    COALESCE(pay.solocab_fees, 0) AS solocab_fees,
    COALESCE(pay.net, 0) AS net_total,
    CASE
      WHEN COALESCE(d.stripe_connect_charges_enabled, false) = false THEN 'no_stripe'
      WHEN COALESCE(pending.total, 0) > 0 THEN 'pending'
      ELSE 'none'
    END AS payment_status,
    COALESCE(pending.total, 0) AS pending_balance
  FROM public.drivers d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  LEFT JOIN LATERAL (
    SELECT
      count(DISTINCT pay_inner.course_id) AS cnt,
      sum(COALESCE(pay_inner.captured_amount, pay_inner.amount, 0)) AS gross,
      sum(COALESCE(pay_inner.application_fee_amount, 0)) AS solocab_fees,
      sum(GREATEST(COALESCE(pay_inner.net_to_driver, 0), 0)) AS net
    FROM public.payments pay_inner
    WHERE pay_inner.driver_id = d.id
      AND pay_inner.status IN ('succeeded', 'captured')
      AND COALESCE(pay_inner.captured_at, pay_inner.created_at) >= ws::timestamptz
      AND COALESCE(pay_inner.captured_at, pay_inner.created_at) < (we + 1)::timestamptz
  ) pay ON true
  LEFT JOIN LATERAL (
    SELECT sum(dbp.net_amount) AS total
    FROM public.driver_balance_pending dbp
    WHERE dbp.driver_id = d.id
      AND dbp.status = 'pending'
  ) pending ON true
  WHERE d.is_demo_account = false
  ORDER BY COALESCE(pay.gross, 0) DESC, COALESCE(pay.net, 0) DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_payment_audit(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  course_id uuid,
  course_number text,
  course_date timestamptz,
  client_name text,
  driver_name text,
  gross_amount numeric,
  solocab_fee numeric,
  net_amount numeric,
  payment_method text,
  payment_status text,
  stripe_pi_id text,
  stripe_transfer_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS course_id,
    c.course_number,
    COALESCE(pay.captured_at, pay.created_at, c.updated_at, c.scheduled_date) AS course_date,
    COALESCE(c.guest_name, pc.first_name || ' ' || pc.last_name, 'N/A') AS client_name,
    COALESCE(pd.first_name || ' ' || pd.last_name, 'N/A') AS driver_name,
    COALESCE(pay.captured_amount, pay.amount, 0)::numeric AS gross_amount,
    COALESCE(pay.application_fee_amount, 0)::numeric AS solocab_fee,
    GREATEST(COALESCE(pay.net_to_driver, 0), 0)::numeric AS net_amount,
    COALESCE(pay.payment_method, c.payment_method_used, c.payment_method, c.payment_method_requested, 'N/A') AS payment_method,
    COALESCE(pay.status, 'unknown') AS payment_status,
    COALESCE(pay.stripe_payment_intent_id, '') AS stripe_pi_id,
    COALESCE(pay.stripe_transfer_id, '') AS stripe_transfer_id
  FROM public.payments pay
  JOIN public.courses c ON c.id = pay.course_id
  LEFT JOIN public.clients cl ON cl.id = c.client_id
  LEFT JOIN public.profiles pc ON pc.id = cl.user_id
  LEFT JOIN public.drivers dr ON dr.id = c.driver_id
  LEFT JOIN public.profiles pd ON pd.id = dr.user_id
  WHERE pay.status IN ('succeeded', 'captured')
  ORDER BY COALESCE(pay.captured_at, pay.created_at, c.updated_at, c.scheduled_date) DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;