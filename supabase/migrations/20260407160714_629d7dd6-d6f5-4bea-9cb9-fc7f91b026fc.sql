
-- RPC: Admin Finance Dashboard Stats
CREATE OR REPLACE FUNCTION get_admin_finance_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  today_start timestamptz := date_trunc('day', now());
  week_start_date date := date_trunc('week', now())::date;
  month_start timestamptz := date_trunc('month', now());
BEGIN
  -- Check admin role
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    -- Driver stats
    'total_drivers', (SELECT count(*) FROM drivers WHERE is_demo_account = false),
    'validated_drivers', (SELECT count(*) FROM drivers WHERE status = 'validated' AND is_demo_account = false),
    'pending_drivers', (SELECT count(*) FROM drivers WHERE status = 'pending' AND is_demo_account = false),
    'rejected_drivers', (SELECT count(*) FROM drivers WHERE status = 'rejected' AND is_demo_account = false),
    'active_today', (SELECT count(*) FROM drivers WHERE last_seen_at >= today_start AND is_demo_account = false),
    'online_now', (SELECT count(*) FROM drivers WHERE last_seen_at >= now() - interval '5 minutes' AND is_demo_account = false),
    'new_drivers_7d', (SELECT count(*) FROM drivers WHERE created_at >= now() - interval '7 days' AND is_demo_account = false),

    -- Course stats today
    'courses_today', (SELECT count(*) FROM courses WHERE created_at >= today_start),
    'courses_in_progress', (SELECT count(*) FROM courses WHERE status IN ('accepted', 'in_progress')),
    'courses_completed_today', (SELECT count(*) FROM courses WHERE status = 'completed' AND updated_at >= today_start),
    'courses_cancelled_today', (SELECT count(*) FROM courses WHERE status = 'cancelled' AND updated_at >= today_start),
    'courses_shared_today', (SELECT count(*) FROM courses WHERE array_length(driver_ids, 1) > 1 AND created_at >= today_start),
    'spontaneous_today', (SELECT count(*) FROM stripe_transactions WHERE transaction_type = 'spontaneous' AND created_at >= today_start),

    -- Finance today
    'ca_today', COALESCE((SELECT sum(COALESCE(final_payment_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at >= today_start), 0),
    'fees_today', COALESCE((SELECT sum(fee_amount) FROM solo_admin_ledger WHERE created_at >= today_start), 0),
    'net_drivers_today', COALESCE((SELECT sum(net_amount) FROM driver_balance_pending WHERE created_at >= today_start), 0),

    -- Weekly
    'courses_week', (SELECT count(*) FROM courses WHERE created_at >= week_start_date::timestamptz),
    'ca_week', COALESCE((SELECT sum(COALESCE(final_payment_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at >= week_start_date::timestamptz), 0),
    'fees_week', COALESCE((SELECT sum(fee_amount) FROM solo_admin_ledger WHERE created_at >= week_start_date::timestamptz), 0),
    'net_drivers_week', COALESCE((SELECT sum(net_amount) FROM driver_balance_pending WHERE created_at >= week_start_date::timestamptz), 0),
    'pending_settlement', COALESCE((SELECT sum(net_amount) FROM driver_balance_pending WHERE status = 'pending'), 0),
    'pending_admin_fees', COALESCE((SELECT sum(fee_amount) FROM solo_admin_ledger WHERE status = 'pending'), 0),
    'drivers_to_pay', (SELECT count(DISTINCT driver_id) FROM driver_balance_pending WHERE status = 'pending' AND net_amount > 0),

    -- Monthly
    'ca_month', COALESCE((SELECT sum(COALESCE(final_payment_amount, 0)) FROM courses WHERE status = 'completed' AND updated_at >= month_start), 0),
    'fees_month', COALESCE((SELECT sum(fee_amount) FROM solo_admin_ledger WHERE created_at >= month_start), 0),

    -- Last settlement
    'last_settlement_amount', COALESCE((SELECT total_transfer_amount FROM weekly_settlements ORDER BY created_at DESC LIMIT 1), 0),
    'last_settlement_date', (SELECT processed_at FROM weekly_settlements WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1),

    -- Alerts
    'disputes_open', (SELECT count(*) FROM courses WHERE payment_status = 'disputed'),
    'payments_error', (SELECT count(*) FROM courses WHERE payment_status = 'error' OR last_payment_error IS NOT NULL),
    'transfers_failed', (SELECT count(*) FROM driver_weekly_balances WHERE transfer_status = 'failed'),
    'drivers_no_stripe', (SELECT count(*) FROM drivers WHERE (stripe_connect_account_id IS NULL OR stripe_connect_charges_enabled = false) AND status = 'validated' AND is_demo_account = false),
    'courses_no_payment', (SELECT count(*) FROM courses WHERE status = 'completed' AND payment_status = 'pending' AND created_at >= now() - interval '7 days')
  ) INTO result;

  RETURN result;
END;
$$;

-- RPC: Admin per-driver finance summary for the current week
CREATE OR REPLACE FUNCTION get_admin_drivers_finance(p_week_start date DEFAULT NULL)
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
  we date := ws + 6;
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
      sum(gross_amount) as gross,
      sum(solocab_fee) as fees,
      sum(net_amount) as net
    FROM driver_balance_pending dbp
    WHERE dbp.driver_id = d.id AND dbp.created_at >= ws::timestamptz AND dbp.created_at < (we + 1)::timestamptz
  ) bp ON true
  LEFT JOIN LATERAL (
    SELECT sum(net_amount) as total
    FROM driver_balance_pending dbp2
    WHERE dbp2.driver_id = d.id AND dbp2.status = 'pending'
  ) pending ON true
  WHERE d.is_demo_account = false
  ORDER BY COALESCE(bp.gross, 0) DESC;
END;
$$;

-- RPC: Admin payment audit trail
CREATE OR REPLACE FUNCTION get_admin_payment_audit(p_limit int DEFAULT 50, p_offset int DEFAULT 0)
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
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    c.id as course_id,
    c.course_number,
    c.scheduled_date as course_date,
    COALESCE(c.guest_name, pc.first_name || ' ' || pc.last_name, 'N/A') as client_name,
    COALESCE(pd.first_name || ' ' || pd.last_name, 'N/A') as driver_name,
    COALESCE(c.final_payment_amount, 0)::numeric as gross_amount,
    COALESCE(c.solocab_fee_amount, 0)::numeric as solocab_fee,
    COALESCE(c.net_amount_to_driver, 0)::numeric as net_amount,
    COALESCE(c.payment_method_used, c.payment_method, 'N/A') as payment_method,
    COALESCE(c.payment_status, 'unknown') as payment_status,
    COALESCE(c.stripe_payment_intent_id, c.final_payment_stripe_id, '') as stripe_pi_id,
    '' as stripe_transfer_id
  FROM courses c
  LEFT JOIN clients cl ON cl.id = c.client_id
  LEFT JOIN profiles pc ON pc.id = cl.user_id
  LEFT JOIN drivers dr ON dr.id = c.driver_id
  LEFT JOIN profiles pd ON pd.id = dr.user_id
  WHERE c.status = 'completed'
  ORDER BY c.scheduled_date DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Add admin RLS for solo_admin_ledger and driver_balance_pending
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can view all pending balances' AND tablename = 'driver_balance_pending') THEN
    CREATE POLICY "Admin can view all pending balances" ON driver_balance_pending FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can view all weekly balances' AND tablename = 'driver_weekly_balances') THEN
    CREATE POLICY "Admin can view all weekly balances" ON driver_weekly_balances FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;
