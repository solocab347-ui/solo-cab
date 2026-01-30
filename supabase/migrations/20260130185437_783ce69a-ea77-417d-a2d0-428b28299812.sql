-- Function to get daily statistics for admin dashboard
CREATE OR REPLACE FUNCTION public.get_daily_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  today_start TIMESTAMP WITH TIME ZONE;
  today_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Define today's boundaries
  today_start := date_trunc('day', now() AT TIME ZONE 'Europe/Paris');
  today_end := today_start + interval '1 day';

  SELECT json_build_object(
    -- Drivers registered today
    'drivers_today', (
      SELECT COUNT(*)
      FROM drivers
      WHERE created_at >= today_start AND created_at < today_end
    ),
    
    -- All clients registered today
    'clients_today', (
      SELECT COUNT(*)
      FROM clients
      WHERE created_at >= today_start AND created_at < today_end
    ),
    
    -- Exclusive clients registered today
    'exclusive_clients_today', (
      SELECT COUNT(*)
      FROM clients
      WHERE created_at >= today_start AND created_at < today_end
      AND is_exclusive = true
    ),
    
    -- Free clients registered today
    'free_clients_today', (
      SELECT COUNT(*)
      FROM clients
      WHERE created_at >= today_start AND created_at < today_end
      AND is_exclusive = false
    ),
    
    -- Revenue today (from all completed courses - amounts are in cents)
    'revenue_today', COALESCE((
      SELECT SUM(price)
      FROM courses
      WHERE created_at >= today_start AND created_at < today_end
      AND status = 'completed'
    ), 0),
    
    -- Number of courses today
    'courses_today', (
      SELECT COUNT(*)
      FROM courses
      WHERE created_at >= today_start AND created_at < today_end
    ),
    
    -- Completed courses today
    'completed_courses_today', (
      SELECT COUNT(*)
      FROM courses
      WHERE created_at >= today_start AND created_at < today_end
      AND status = 'completed'
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_daily_stats() TO authenticated;