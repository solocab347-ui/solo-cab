
CREATE OR REPLACE FUNCTION public.get_daily_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_start TIMESTAMPTZ;
  result JSON;
BEGIN
  today_start := (now() AT TIME ZONE 'Europe/Paris')::date::timestamptz;

  SELECT json_build_object(
    'drivers_today', (SELECT COUNT(*) FROM drivers WHERE created_at >= today_start AND is_demo_account = false),
    'clients_today', (SELECT COUNT(*) FROM clients WHERE created_at >= today_start),
    'exclusive_clients_today', (SELECT COUNT(*) FROM clients WHERE created_at >= today_start AND is_exclusive = true),
    'free_clients_today', (SELECT COUNT(*) FROM clients WHERE created_at >= today_start AND is_exclusive = false),
    'revenue_today', COALESCE((
      SELECT SUM(COALESCE(final_payment_amount, guest_estimated_price, 0))
      FROM courses
      WHERE status = 'completed'
      AND updated_at >= today_start
    ), 0),
    'courses_today', (SELECT COUNT(*) FROM courses WHERE created_at >= today_start AND status != 'cancelled'),
    'completed_courses_today', (SELECT COUNT(*) FROM courses WHERE status = 'completed' AND updated_at >= today_start)
  ) INTO result;

  RETURN result;
END;
$$;
