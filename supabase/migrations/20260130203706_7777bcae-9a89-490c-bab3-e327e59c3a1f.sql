-- Drop and recreate the function with correct column names
DROP FUNCTION IF EXISTS get_daily_stats();

CREATE OR REPLACE FUNCTION get_daily_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today_start TIMESTAMPTZ;
  result JSON;
BEGIN
  -- Get start of today in Europe/Paris timezone
  today_start := (now() AT TIME ZONE 'Europe/Paris')::date::timestamptz;
  
  SELECT json_build_object(
    'drivers_today', (SELECT COUNT(*) FROM drivers WHERE created_at >= today_start),
    'clients_today', (SELECT COUNT(*) FROM clients WHERE created_at >= today_start),
    'exclusive_clients_today', (SELECT COUNT(*) FROM clients WHERE created_at >= today_start AND is_exclusive = true),
    'free_clients_today', (SELECT COUNT(*) FROM clients WHERE created_at >= today_start AND is_exclusive = false),
    'revenue_today', COALESCE((
      SELECT SUM(COALESCE(guest_estimated_price, 0))
      FROM courses 
      WHERE status = 'completed' 
      AND created_at >= today_start
    ), 0),
    'courses_today', (SELECT COUNT(*) FROM courses WHERE created_at >= today_start)
  ) INTO result;
  
  RETURN result;
END;
$$;