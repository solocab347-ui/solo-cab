CREATE OR REPLACE FUNCTION public.get_admin_finance_stats(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  v_finance_start timestamptz;
BEGIN
  -- Get finance go-live date to exclude old test data
  SELECT (value->>'starts_at')::timestamptz INTO v_finance_start
  FROM public.system_settings
  WHERE id = 'finance_go_live_at';
  
  v_finance_start := COALESCE(v_finance_start, '2026-04-07T00:00:00Z'::timestamptz);

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
        AND d.status = 'active'
        AND (d.stripe_connect_account_id IS NULL OR d.stripe_connect_charges_enabled = false)
    ),
    'courses_no_payment', (
      SELECT count(*)
      FROM public.courses c
      WHERE c.status = 'completed'
        AND c.updated_at >= v_finance_start
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