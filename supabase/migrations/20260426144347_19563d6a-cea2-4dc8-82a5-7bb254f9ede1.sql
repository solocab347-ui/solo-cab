CREATE OR REPLACE FUNCTION public.get_admin_finance_stats(p_start timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end timestamp with time zone DEFAULT NULL::timestamp with time zone)
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
  SELECT (value->>'starts_at')::timestamptz INTO v_finance_start
  FROM public.system_settings
  WHERE id = 'finance_go_live_at';
  v_finance_start := COALESCE(v_finance_start, '2026-04-07T00:00:00Z'::timestamptz);

  SELECT json_build_object(
    'total_drivers', (SELECT count(*) FROM public.drivers WHERE is_demo_account = false),
    'validated_drivers', (SELECT count(*) FROM public.drivers WHERE is_demo_account = false AND status = 'validated'),
    'pending_drivers', (SELECT count(*) FROM public.drivers WHERE is_demo_account = false AND status = 'pending'),
    'rejected_drivers', (SELECT count(*) FROM public.drivers WHERE is_demo_account = false AND status = 'rejected'),
    'online_now', (SELECT count(*) FROM public.drivers WHERE is_demo_account = false AND driver_status = 'online'),
    'active_today', (
      SELECT count(DISTINCT c.driver_id)
      FROM public.courses c
      WHERE c.updated_at >= v_today_start AND c.updated_at < v_today_end
        AND c.status IN ('completed', 'in_progress', 'accepted')
    ),
    'new_drivers_7d', (
      SELECT count(*) FROM public.drivers
      WHERE is_demo_account = false AND created_at >= v_7d_ago
    ),
    'courses_today', (
      SELECT count(*) FROM public.courses
      WHERE created_at >= v_today_start AND created_at < v_today_end
    ),
    'courses_in_progress', (SELECT count(*) FROM public.courses WHERE status = 'in_progress'),
    'courses_completed_today', (
      SELECT count(*) FROM public.courses
      WHERE status = 'completed' AND updated_at >= v_today_start AND updated_at < v_today_end
    ),
    'courses_cancelled_today', (
      SELECT count(*) FROM public.courses
      WHERE status = 'cancelled' AND updated_at >= v_today_start AND updated_at < v_today_end
    ),
    'courses_shared_today', (
      SELECT count(*) FROM public.shared_courses
      WHERE created_at >= v_today_start AND created_at < v_today_end
    ),
    'spontaneous_today', (
      SELECT count(*) FROM public.stripe_transactions
      WHERE transaction_type IN ('spontaneous_payment','spontaneous')
        AND status IN ('succeeded','completed')
        AND created_at >= v_today_start AND created_at < v_today_end
    ),
    'ca_today', COALESCE((
      SELECT sum(COALESCE(st.gross_amount, 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at >= v_today_start AND st.created_at < v_today_end
    ), 0),
    'fees_today', COALESCE((
      SELECT sum(COALESCE(st.solocab_fee_amount, 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at >= v_today_start AND st.created_at < v_today_end
    ), 0),
    'stripe_fees_today', COALESCE((
      SELECT sum(COALESCE(st.stripe_fee_amount, 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at >= v_today_start AND st.created_at < v_today_end
    ), 0),
    'net_drivers_today', COALESCE((
      SELECT sum(GREATEST(COALESCE(st.net_amount, 0), 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at >= v_today_start AND st.created_at < v_today_end
    ), 0),
    'ca_week', COALESCE((
      SELECT sum(COALESCE(st.gross_amount, 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at >= v_week_start
    ), 0),
    'fees_week', COALESCE((
      SELECT sum(COALESCE(st.solocab_fee_amount, 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at >= v_week_start
    ), 0),
    'stripe_fees_week', COALESCE((
      SELECT sum(COALESCE(st.stripe_fee_amount, 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at >= v_week_start
    ), 0),
    'net_drivers_week', COALESCE((
      SELECT sum(GREATEST(COALESCE(st.net_amount, 0), 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at >= v_week_start
    ), 0),
    'pending_settlement', COALESCE((
      SELECT sum(dbp.net_amount) FROM public.driver_balance_pending dbp WHERE dbp.status = 'pending'
    ), 0),
    'pending_admin_fees', COALESCE((
      SELECT sum(sal.fee_amount) FROM public.solo_admin_ledger sal WHERE sal.status = 'pending'
    ), 0),
    'drivers_to_pay', (
      SELECT count(DISTINCT dbp.driver_id) FROM public.driver_balance_pending dbp
      WHERE dbp.status = 'pending' AND dbp.net_amount > 0
    ),
    'last_settlement_amount', COALESCE((
      SELECT total_net_amount FROM public.weekly_settlements
      ORDER BY week_start DESC LIMIT 1
    ), 0),
    'transfers_failed', (
      SELECT count(*) FROM public.driver_weekly_balances
      WHERE transfer_status IN ('failed','error')
    ),
    'ca_month', COALESCE((
      SELECT sum(COALESCE(st.gross_amount, 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at >= v_month_start
    ), 0),
    'fees_month', COALESCE((
      SELECT sum(COALESCE(st.solocab_fee_amount, 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at >= v_month_start
    ), 0),
    'stripe_fees_month', COALESCE((
      SELECT sum(COALESCE(st.stripe_fee_amount, 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at >= v_month_start
    ), 0),
    'disputes_open', COALESCE((
      SELECT count(*) FROM public.client_fraud_flags WHERE is_resolved = false
    ), 0),
    'payments_error', (
      SELECT count(*) FROM public.payments p
      WHERE p.status IN ('failed', 'canceled')
        AND COALESCE(p.failed_at, p.canceled_at, p.updated_at, p.created_at) >= v_7d_ago
    ),
    'drivers_no_stripe', (
      SELECT count(*) FROM public.drivers d
      WHERE d.is_demo_account = false
        AND d.status = 'validated'
        AND (d.stripe_connect_account_id IS NULL OR d.stripe_connect_charges_enabled = false)
    ),
    'courses_no_payment', (
      SELECT count(*) FROM public.courses c
      WHERE c.status = 'completed'
        AND c.updated_at >= v_finance_start
        AND NOT EXISTS (
          SELECT 1 FROM public.stripe_transactions st
          WHERE st.course_id = c.id AND st.status IN ('succeeded', 'completed')
        )
    ),
    'courses_period', (
      SELECT count(DISTINCT st.course_id)
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at BETWEEN v_period_start AND v_period_end
    ),
    'ca_period', COALESCE((
      SELECT sum(COALESCE(st.gross_amount, 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at BETWEEN v_period_start AND v_period_end
    ), 0),
    'fees_period', COALESCE((
      SELECT sum(COALESCE(st.solocab_fee_amount, 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at BETWEEN v_period_start AND v_period_end
    ), 0),
    'stripe_fees_period', COALESCE((
      SELECT sum(COALESCE(st.stripe_fee_amount, 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at BETWEEN v_period_start AND v_period_end
    ), 0),
    'net_drivers_period', COALESCE((
      SELECT sum(GREATEST(COALESCE(st.net_amount, 0), 0))
      FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at BETWEEN v_period_start AND v_period_end
    ), 0),
    'courses_cancelled_period', (
      SELECT count(*) FROM public.courses c
      WHERE c.status = 'cancelled' AND c.updated_at BETWEEN v_period_start AND v_period_end
    ),
    'courses_shared_period', (
      SELECT count(*) FROM public.shared_courses
      WHERE created_at BETWEEN v_period_start AND v_period_end
    ),
    'spontaneous_period', (
      SELECT count(*) FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.transaction_type IN ('spontaneous_payment','spontaneous')
        AND st.created_at BETWEEN v_period_start AND v_period_end
    ),
    'drivers_active_period', (
      SELECT count(DISTINCT st.driver_id) FROM public.stripe_transactions st
      WHERE st.status IN ('succeeded', 'completed')
        AND st.created_at BETWEEN v_period_start AND v_period_end
    ),
    'period_start', v_period_start,
    'period_end', v_period_end
  ) INTO result;

  RETURN result;
END;
$function$;