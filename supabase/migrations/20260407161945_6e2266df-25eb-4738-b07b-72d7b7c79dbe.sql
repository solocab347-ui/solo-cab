
-- Drop and recreate with period parameters
CREATE OR REPLACE FUNCTION get_admin_finance_stats(
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  today_start timestamptz := date_trunc('day', now());
  period_start timestamptz := COALESCE(p_start, date_trunc('week', now()));
  period_end timestamptz := COALESCE(p_end, now());
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    -- Driver stats (always current)
    'total_drivers', (SELECT count(*) FROM drivers WHERE is_demo_account = false),
    'validated_drivers', (SELECT count(*) FROM drivers WHERE status = 'validated' AND is_demo_account = false),
    'pending_drivers', (SELECT count(*) FROM drivers WHERE status = 'pending' AND is_demo_account = false),
    'rejected_drivers', (SELECT count(*) FROM drivers WHERE status = 'rejected' AND is_demo_account = false),
    'active_today', (SELECT count(*) FROM drivers WHERE last_seen_at >= today_start AND is_demo_account = false),
    'online_now', (SELECT count(*) FROM drivers WHERE last_seen_at >= now() - interval '5 minutes' AND is_demo_account = false),
    'new_drivers_7d', (SELECT count(*) FROM drivers WHERE created_at >= now() - interval '7 days' AND is_demo_account = false),

    -- Today stats (always today)
    'courses_today', (SELECT count(*) FROM courses WHERE created_at >= today_start),
    'courses_in_progress', (SELECT count(*) FROM courses WHERE status IN ('accepted', 'in_progress')),
    'courses_completed_today', (SELECT count(*) FROM courses WHERE status = 'completed' AND updated_at >= today_start),
    'courses_cancelled_today', (SELECT count(*) FROM courses WHERE status = 'cancelled' AND updated_at >= today_start),
    'courses_shared_today', (SELECT count(*) FROM courses WHERE array_length(driver_ids, 1) > 1 AND created_at >= today_start),
    'spontaneous_today', (SELECT count(*) FROM stripe_transactions WHERE transaction_type = 'spontaneous' AND created_at >= today_start),
    'ca_today', COALESCE((SELECT sum(COALESCE(final_payment_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at >= today_start), 0),
    'fees_today', COALESCE((SELECT sum(fee_amount) FROM solo_admin_ledger WHERE created_at >= today_start), 0),
    'net_drivers_today', COALESCE((SELECT sum(net_amount) FROM driver_balance_pending WHERE created_at >= today_start), 0),

    -- Period stats (filtered by p_start/p_end)
    'courses_period', (SELECT count(*) FROM courses WHERE updated_at >= period_start AND updated_at <= period_end AND status = 'completed'),
    'ca_period', COALESCE((SELECT sum(COALESCE(final_payment_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at >= period_start AND updated_at <= period_end), 0),
    'fees_period', COALESCE((SELECT sum(COALESCE(solocab_fee_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at >= period_start AND updated_at <= period_end), 0),
    'net_drivers_period', COALESCE((SELECT sum(COALESCE(net_amount_to_driver, 0)) FROM courses WHERE status = 'completed' AND updated_at >= period_start AND updated_at <= period_end), 0),
    'courses_cancelled_period', (SELECT count(*) FROM courses WHERE status = 'cancelled' AND updated_at >= period_start AND updated_at <= period_end),
    'courses_shared_period', (SELECT count(*) FROM courses WHERE array_length(driver_ids, 1) > 1 AND status = 'completed' AND updated_at >= period_start AND updated_at <= period_end),
    'spontaneous_period', (SELECT count(*) FROM stripe_transactions WHERE transaction_type = 'spontaneous' AND created_at >= period_start AND created_at <= period_end),
    'drivers_active_period', (SELECT count(DISTINCT driver_id) FROM courses WHERE status = 'completed' AND updated_at >= period_start AND updated_at <= period_end),

    -- Settlement/pending (always current)
    'pending_settlement', COALESCE((SELECT sum(net_amount) FROM driver_balance_pending WHERE status = 'pending'), 0),
    'pending_admin_fees', COALESCE((SELECT sum(fee_amount) FROM solo_admin_ledger WHERE status = 'pending'), 0),
    'drivers_to_pay', (SELECT count(DISTINCT driver_id) FROM driver_balance_pending WHERE status = 'pending' AND net_amount > 0),
    'last_settlement_amount', COALESCE((SELECT total_transfer_amount FROM weekly_settlements ORDER BY created_at DESC LIMIT 1), 0),
    'last_settlement_date', (SELECT processed_at FROM weekly_settlements WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1),

    -- Alerts (always current)
    'disputes_open', (SELECT count(*) FROM courses WHERE payment_status = 'disputed'),
    'payments_error', (SELECT count(*) FROM courses WHERE payment_status = 'error' OR last_payment_error IS NOT NULL),
    'transfers_failed', (SELECT count(*) FROM driver_weekly_balances WHERE transfer_status = 'failed'),
    'drivers_no_stripe', (SELECT count(*) FROM drivers WHERE (stripe_connect_account_id IS NULL OR stripe_connect_charges_enabled = false) AND status = 'validated' AND is_demo_account = false),
    'courses_no_payment', (SELECT count(*) FROM courses WHERE status = 'completed' AND payment_status = 'pending' AND created_at >= now() - interval '7 days'),

    -- Period metadata
    'period_start', period_start,
    'period_end', period_end
  ) INTO result;

  RETURN result;
END;
$$;

-- Also update drivers finance to accept period
CREATE OR REPLACE FUNCTION get_admin_drivers_finance(p_week_start date DEFAULT NULL, p_period_end date DEFAULT NULL)
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
AS $$
DECLARE
  ws date := COALESCE(p_week_start, date_trunc('week', now())::date);
  we date := COALESCE(p_period_end, (ws + 6));
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    d.id as driver_id,
    COALESCE(p.first_name || ' ' || p.last_name, 'N/A') as driver_name,
    d.company_name,
    d.stripe_connect_account_id as stripe_account_id,
    COALESCE(d.stripe_connect_charges_enabled, false) as stripe_active,
    COALESCE(bp.cnt, 0) as courses_count,
    COALESCE(bp.gross, 0) as gross_total,
    COALESCE(bp.fees, 0) as solocab_fees,
    COALESCE(bp.net, 0) as net_total,
    CASE
      WHEN COALESCE(d.stripe_connect_charges_enabled, false) = false THEN 'no_stripe'
      WHEN COALESCE(bp.net, 0) = 0 THEN 'none'
      ELSE 'pending'
    END as payment_status,
    COALESCE(pending.total, 0) as pending_balance
  FROM drivers d
  LEFT JOIN profiles p ON p.id = d.user_id
  LEFT JOIN LATERAL (
    SELECT
      count(*) as cnt,
      sum(c.final_payment_amount) as gross,
      sum(c.solocab_fee_amount) as fees,
      sum(c.net_amount_to_driver) as net
    FROM courses c
    WHERE c.driver_id = d.id AND c.status = 'completed' AND c.updated_at >= ws::timestamptz AND c.updated_at < (we + 1)::timestamptz
  ) bp ON true
  LEFT JOIN LATERAL (
    SELECT sum(dbp2.net_amount) as total
    FROM driver_balance_pending dbp2
    WHERE dbp2.driver_id = d.id AND dbp2.status = 'pending'
  ) pending ON true
  WHERE d.is_demo_account = false
  ORDER BY COALESCE(bp.gross, 0) DESC;
END;
$$;
