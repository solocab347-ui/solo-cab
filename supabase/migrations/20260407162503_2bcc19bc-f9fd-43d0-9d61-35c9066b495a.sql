
DROP FUNCTION IF EXISTS public.get_admin_drivers_finance(date);
DROP FUNCTION IF EXISTS public.get_admin_drivers_finance(date, date);

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
      sum(COALESCE(c.final_payment_amount, 0)) as gross,
      sum(COALESCE(c.solocab_fee_amount, 0)) as fees,
      sum(COALESCE(c.net_amount_to_driver, 0)) as net
    FROM courses c
    WHERE c.driver_id = d.id
      AND c.status = 'completed'
      AND c.updated_at >= ws::timestamptz
      AND c.updated_at < (we + 1)::timestamptz
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
