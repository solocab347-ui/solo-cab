
CREATE OR REPLACE FUNCTION public.get_admin_finance_stats(p_start timestamptz DEFAULT NULL, p_end timestamptz DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- DRIVERS
    'total_drivers', (SELECT count(*) FROM drivers WHERE is_demo_account = false),
    'pending_drivers', (SELECT count(*) FROM drivers WHERE is_demo_account = false AND status = 'pending'),
    'active_today', (SELECT count(DISTINCT driver_id) FROM courses WHERE updated_at >= v_today_start AND updated_at < v_today_end AND status IN ('completed', 'in_progress', 'accepted')),
    'new_drivers_7d', (SELECT count(*) FROM drivers WHERE is_demo_account = false AND created_at >= v_7d_ago),

    -- ACTIVITY TODAY
    'courses_today', (SELECT count(*) FROM courses WHERE created_at >= v_today_start AND created_at < v_today_end),
    'courses_in_progress', (SELECT count(*) FROM courses WHERE status = 'in_progress'),
    'courses_completed_today', (SELECT count(*) FROM courses WHERE status = 'completed' AND updated_at >= v_today_start AND updated_at < v_today_end),
    'courses_shared_today', 0,

    -- FINANCES TODAY (from financial tables)
    'ca_today', COALESCE((SELECT SUM(gross_amount) FROM driver_balance_pending WHERE created_at >= v_today_start AND created_at < v_today_end), 0),
    'fees_today', COALESCE((SELECT SUM(fee_amount) FROM solo_admin_ledger WHERE created_at >= v_today_start AND created_at < v_today_end), 0),
    'net_drivers_today', COALESCE((SELECT SUM(net_amount) FROM driver_balance_pending WHERE created_at >= v_today_start AND created_at < v_today_end), 0),

    -- FINANCES WEEK
    'ca_week', COALESCE((SELECT SUM(gross_amount) FROM driver_balance_pending WHERE created_at >= v_week_start), 0),
    'fees_week', COALESCE((SELECT SUM(fee_amount) FROM solo_admin_ledger WHERE created_at >= v_week_start), 0),
    'net_drivers_week', COALESCE((SELECT SUM(net_amount) FROM driver_balance_pending WHERE created_at >= v_week_start), 0),

    -- PENDING SETTLEMENT
    'pending_settlement', COALESCE((SELECT SUM(net_amount) FROM driver_balance_pending WHERE status = 'pending'), 0),
    'pending_admin_fees', COALESCE((SELECT SUM(fee_amount) FROM solo_admin_ledger WHERE status = 'pending'), 0),
    'drivers_to_pay', (SELECT count(DISTINCT driver_id) FROM driver_balance_pending WHERE status = 'pending' AND net_amount > 0),

    -- FINANCES MONTH
    'ca_month', COALESCE((SELECT SUM(gross_amount) FROM driver_balance_pending WHERE created_at >= v_month_start), 0),
    'fees_month', COALESCE((SELECT SUM(fee_amount) FROM solo_admin_ledger WHERE created_at >= v_month_start), 0),

    -- ALERTS
    'disputes_open', 0,
    'payments_error', (SELECT count(*) FROM stripe_transactions WHERE status = 'failed' AND created_at >= v_7d_ago),
    'drivers_no_stripe', (SELECT count(*) FROM drivers WHERE is_demo_account = false AND (stripe_connect_account_id IS NULL OR stripe_connect_charges_enabled = false)),
    'courses_no_payment', (SELECT count(*) FROM courses WHERE status = 'completed' AND final_payment_amount IS NULL AND updated_at >= v_7d_ago),

    -- PERIOD (for AdminPeriodSummary & AdminFinanceKPIs)
    'courses_period', (SELECT count(*) FROM courses WHERE status = 'completed' AND updated_at BETWEEN v_period_start AND v_period_end),
    'ca_period', COALESCE((SELECT SUM(gross_amount) FROM driver_balance_pending WHERE created_at BETWEEN v_period_start AND v_period_end), 0),
    'fees_period', COALESCE((SELECT SUM(fee_amount) FROM solo_admin_ledger WHERE created_at BETWEEN v_period_start AND v_period_end), 0),
    'net_drivers_period', COALESCE((SELECT SUM(net_amount) FROM driver_balance_pending WHERE created_at BETWEEN v_period_start AND v_period_end), 0),
    'courses_cancelled_period', (SELECT count(*) FROM courses WHERE status = 'cancelled' AND updated_at BETWEEN v_period_start AND v_period_end),
    'courses_shared_period', 0,
    'spontaneous_period', 0,
    'drivers_active_period', (SELECT count(DISTINCT driver_id) FROM courses WHERE status = 'completed' AND updated_at BETWEEN v_period_start AND v_period_end),
    'period_start', v_period_start,
    'period_end', v_period_end
  ) INTO result;

  RETURN result;
END;
$$;
