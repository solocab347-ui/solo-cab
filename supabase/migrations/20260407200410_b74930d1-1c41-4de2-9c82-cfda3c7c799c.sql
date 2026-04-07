CREATE OR REPLACE FUNCTION public.get_daily_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_start timestamptz := ((timezone('Europe/Paris', now()))::date AT TIME ZONE 'Europe/Paris');
  v_today_end timestamptz := v_today_start + interval '1 day';
  v_finance_start timestamptz;
  result json;
BEGIN
  SELECT (value->>'starts_at')::timestamptz INTO v_finance_start
  FROM public.system_settings
  WHERE id = 'finance_go_live_at';

  v_finance_start := COALESCE(v_finance_start, '2026-04-07T00:00:00Z'::timestamptz);

  SELECT json_build_object(
    'drivers_today', (
      SELECT COUNT(*)
      FROM public.drivers
      WHERE created_at >= v_today_start
        AND created_at < v_today_end
        AND is_demo_account = false
    ),
    'clients_today', (
      SELECT COUNT(*)
      FROM public.clients
      WHERE created_at >= v_today_start
        AND created_at < v_today_end
    ),
    'exclusive_clients_today', (
      SELECT COUNT(*)
      FROM public.clients
      WHERE created_at >= v_today_start
        AND created_at < v_today_end
        AND is_exclusive = true
    ),
    'free_clients_today', (
      SELECT COUNT(*)
      FROM public.clients
      WHERE created_at >= v_today_start
        AND created_at < v_today_end
        AND is_exclusive = false
    ),
    'revenue_today', COALESCE((
      SELECT SUM(COALESCE(p.captured_amount, p.amount, 0))
      FROM public.payments p
      WHERE p.status IN ('succeeded', 'captured')
        AND COALESCE(p.captured_at, p.created_at) >= GREATEST(v_today_start, v_finance_start)
        AND COALESCE(p.captured_at, p.created_at) < v_today_end
    ), 0),
    'courses_today', (
      SELECT COUNT(*)
      FROM public.courses
      WHERE created_at >= v_today_start
        AND created_at < v_today_end
        AND status <> 'cancelled'
    ),
    'completed_courses_today', (
      SELECT COUNT(*)
      FROM public.courses
      WHERE status = 'completed'
        AND updated_at >= v_today_start
        AND updated_at < v_today_end
    )
  ) INTO result;

  RETURN result;
END;
$$;