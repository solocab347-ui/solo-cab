
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
  v_start timestamptz := COALESCE(p_start, date_trunc('week', now()));
  v_end timestamptz := COALESCE(p_end, now());
BEGIN
  SELECT json_build_object(
    'total_ca', COALESCE((
      SELECT SUM(COALESCE(c.final_payment_amount, 0))
      FROM courses c
      WHERE c.status = 'completed'
        AND c.updated_at BETWEEN v_start AND v_end
    ), 0),
    'total_courses', COALESCE((
      SELECT COUNT(*)
      FROM courses c
      WHERE c.status = 'completed'
        AND c.updated_at BETWEEN v_start AND v_end
    ), 0),
    'total_fees_solocab', COALESCE((
      SELECT SUM(COALESCE(st.solocab_fee_amount, 0))
      FROM stripe_transactions st
      WHERE st.created_at BETWEEN v_start AND v_end
        AND st.status = 'succeeded'
    ), 0) + COALESCE((
      SELECT SUM(COALESCE(amount_cents, 0))::numeric / 100
      FROM solo_admin_ledger
      WHERE created_at BETWEEN v_start AND v_end
    ), 0) + COALESCE((
      SELECT SUM(COALESCE(fee_amount_cents, 0))::numeric / 100
      FROM driver_fees_ledger
      WHERE created_at BETWEEN v_start AND v_end
    ), 0),
    'total_pending_drivers', COALESCE((
      SELECT SUM(COALESCE(pending_amount_cents, 0))::numeric / 100
      FROM driver_balance_pending
    ), 0),
    'total_cancellations', COALESCE((
      SELECT COUNT(*)
      FROM courses c
      WHERE c.status = 'cancelled'
        AND c.updated_at BETWEEN v_start AND v_end
    ), 0),
    'period_start', v_start,
    'period_end', v_end
  ) INTO result;
  
  RETURN result;
END;
$$;
