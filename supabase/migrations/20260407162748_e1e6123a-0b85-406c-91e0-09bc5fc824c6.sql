
DROP FUNCTION IF EXISTS public.get_admin_finance_stats(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.get_admin_finance_stats(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
)
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
    -- Drivers
    'total_drivers', (SELECT count(*) FROM drivers WHERE is_demo_account = false),
    'pending_drivers', (SELECT count(*) FROM drivers WHERE is_demo_account = false AND status = 'pending'),
    'active_today', (SELECT count(DISTINCT driver_id) FROM courses WHERE updated_at >= v_today_start AND updated_at < v_today_end AND status IN ('completed', 'in_progress', 'accepted')),
    'online_now', 0,
    'new_drivers_7d', (SELECT count(*) FROM drivers WHERE is_demo_account = false AND created_at >= v_7d_ago),
    
    -- Courses today
    'courses_today', (SELECT count(*) FROM courses WHERE created_at >= v_today_start AND created_at < v_today_end),
    'courses_in_progress', (SELECT count(*) FROM courses WHERE status = 'in_progress'),
    'courses_completed_today', (SELECT count(*) FROM courses WHERE status = 'completed' AND updated_at >= v_today_start AND updated_at < v_today_end),
    'courses_shared_today', (SELECT count(*) FROM courses WHERE is_shared = true AND created_at >= v_today_start AND created_at < v_today_end),
    'spontaneous_today', 0,
    'cancelled_today', (SELECT count(*) FROM courses WHERE status = 'cancelled' AND updated_at >= v_today_start AND updated_at < v_today_end),
    
    -- Finance today
    'ca_today', COALESCE((SELECT SUM(COALESCE(final_payment_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at >= v_today_start AND updated_at < v_today_end), 0),
    'fees_today', COALESCE((SELECT SUM(COALESCE(solocab_fee_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at >= v_today_start AND updated_at < v_today_end), 0),
    'net_drivers_today', COALESCE((SELECT SUM(COALESCE(net_amount_to_driver, 0)) FROM courses WHERE status = 'completed' AND updated_at >= v_today_start AND updated_at < v_today_end), 0),
    
    -- Weekly
    'courses_week', (SELECT count(*) FROM courses WHERE status = 'completed' AND updated_at >= v_week_start),
    'ca_week', COALESCE((SELECT SUM(COALESCE(final_payment_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at >= v_week_start), 0),
    'fees_week', COALESCE((SELECT SUM(COALESCE(solocab_fee_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at >= v_week_start), 0),
    'net_drivers_week', COALESCE((SELECT SUM(COALESCE(net_amount_to_driver, 0)) FROM courses WHERE status = 'completed' AND updated_at >= v_week_start), 0),
    'pending_settlement', COALESCE((SELECT SUM(net_amount) FROM driver_balance_pending WHERE status = 'pending'), 0),
    'pending_admin_fees', COALESCE((SELECT SUM(fee_amount) FROM solo_admin_ledger WHERE status = 'pending'), 0),
    'drivers_to_pay', (SELECT count(DISTINCT driver_id) FROM driver_balance_pending WHERE status = 'pending' AND net_amount > 0),
    
    -- Month
    'ca_month', COALESCE((SELECT SUM(COALESCE(final_payment_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at >= v_month_start), 0),
    'fees_month', COALESCE((SELECT SUM(COALESCE(solocab_fee_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at >= v_month_start), 0),
    
    -- Alerts
    'disputes_open', 0,
    'payments_error', (SELECT count(*) FROM stripe_transactions WHERE status = 'failed' AND created_at >= v_7d_ago),
    'drivers_no_stripe', (SELECT count(*) FROM drivers WHERE is_demo_account = false AND (stripe_connect_account_id IS NULL OR stripe_connect_charges_enabled = false)),
    'courses_no_payment', (SELECT count(*) FROM courses WHERE status = 'completed' AND final_payment_amount IS NULL AND updated_at >= v_7d_ago),
    
    -- Period (for Finances hub)
    'total_ca', COALESCE((SELECT SUM(COALESCE(final_payment_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at BETWEEN v_period_start AND v_period_end), 0),
    'total_courses', (SELECT count(*) FROM courses WHERE status = 'completed' AND updated_at BETWEEN v_period_start AND v_period_end),
    'total_fees_solocab', COALESCE((SELECT SUM(COALESCE(solocab_fee_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at BETWEEN v_period_start AND v_period_end), 0),
    'total_pending_drivers', COALESCE((SELECT SUM(net_amount) FROM driver_balance_pending WHERE status = 'pending'), 0),
    'total_cancellations', (SELECT count(*) FROM courses WHERE status = 'cancelled' AND updated_at BETWEEN v_period_start AND v_period_end),
    'period_start', v_period_start,
    'period_end', v_period_end
  ) INTO result;
  
  RETURN result;
END;
$$;
