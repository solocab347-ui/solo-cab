
CREATE OR REPLACE FUNCTION get_driver_dashboard_stats(p_driver_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result json;
  v_today_start timestamptz;
  v_today_end timestamptz;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_year_start timestamptz;
  v_year_end timestamptz;
BEGIN
  v_today_start := date_trunc('day', now());
  v_today_end := v_today_start + interval '1 day' - interval '1 millisecond';
  v_month_start := date_trunc('month', now());
  v_month_end := (v_month_start + interval '1 month') - interval '1 millisecond';
  v_year_start := date_trunc('year', now());
  v_year_end := (v_year_start + interval '1 year') - interval '1 millisecond';

  SELECT json_build_object(
    'today_courses', (
      SELECT count(DISTINCT course_id) FROM factures
      WHERE driver_id = p_driver_id AND payment_status = 'paid'
        AND paid_at >= v_today_start AND paid_at <= v_today_end
    ),
    'today_revenue', (
      SELECT COALESCE(sum(amount), 0) FROM factures
      WHERE driver_id = p_driver_id AND payment_status = 'paid'
        AND paid_at >= v_today_start AND paid_at <= v_today_end
    ),
    'month_clients', (
      SELECT count(*) FROM clients
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND created_at >= v_month_start AND created_at <= v_month_end
    ),
    'month_courses', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND created_at >= v_month_start AND created_at <= v_month_end
    ),
    'month_completed', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND updated_at >= v_month_start AND updated_at <= v_month_end
    ),
    'month_revenue', (
      SELECT COALESCE(sum(amount), 0) FROM factures
      WHERE driver_id = p_driver_id AND payment_status = 'paid'
        AND paid_at >= v_month_start AND paid_at <= v_month_end
    ),
    'year_courses', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND created_at >= v_year_start AND created_at <= v_year_end
    ),
    'year_completed', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND updated_at >= v_year_start AND updated_at <= v_year_end
    ),
    'year_revenue', (
      SELECT COALESCE(sum(amount), 0) FROM factures
      WHERE driver_id = p_driver_id AND payment_status = 'paid'
        AND paid_at >= v_year_start AND paid_at <= v_year_end
    ),
    'year_clients', (
      SELECT count(*) FROM clients
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND created_at >= v_year_start AND created_at <= v_year_end
    )
  ) INTO result;

  RETURN result;
END;
$$;
