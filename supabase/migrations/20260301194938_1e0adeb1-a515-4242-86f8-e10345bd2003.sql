
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
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_year_start timestamptz;
  v_year_end timestamptz;
BEGIN
  v_today_start := date_trunc('day', now());
  v_today_end := v_today_start + interval '1 day' - interval '1 millisecond';
  -- Week starts Monday (ISO)
  v_week_start := date_trunc('week', now());
  v_week_end := v_week_start + interval '7 days' - interval '1 millisecond';
  v_month_start := date_trunc('month', now());
  v_month_end := (v_month_start + interval '1 month') - interval '1 millisecond';
  v_year_start := date_trunc('year', now());
  v_year_end := (v_year_start + interval '1 year') - interval '1 millisecond';

  SELECT json_build_object(
    -- TODAY
    'today_courses', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_today_start AND scheduled_date <= v_today_end
    ),
    'today_revenue', (
      SELECT COALESCE(sum(COALESCE(final_payment_amount, guest_estimated_price, 0)), 0) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_today_start AND scheduled_date <= v_today_end
    ),
    'today_clients', (
      SELECT count(*) FROM clients
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND created_at >= v_today_start AND created_at <= v_today_end
    ),
    -- WEEK
    'week_courses', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_week_start AND scheduled_date <= v_week_end
    ),
    'week_revenue', (
      SELECT COALESCE(sum(COALESCE(final_payment_amount, guest_estimated_price, 0)), 0) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_week_start AND scheduled_date <= v_week_end
    ),
    'week_clients', (
      SELECT count(*) FROM clients
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND created_at >= v_week_start AND created_at <= v_week_end
    ),
    -- MONTH
    'month_courses', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_month_start AND scheduled_date <= v_month_end
    ),
    'month_revenue', (
      SELECT COALESCE(sum(COALESCE(final_payment_amount, guest_estimated_price, 0)), 0) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_month_start AND scheduled_date <= v_month_end
    ),
    'month_clients', (
      SELECT count(*) FROM clients
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND created_at >= v_month_start AND created_at <= v_month_end
    ),
    'month_completed', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND updated_at >= v_month_start AND updated_at <= v_month_end
    ),
    -- YEAR
    'year_courses', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_year_start AND scheduled_date <= v_year_end
    ),
    'year_revenue', (
      SELECT COALESCE(sum(COALESCE(final_payment_amount, guest_estimated_price, 0)), 0) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_year_start AND scheduled_date <= v_year_end
    ),
    'year_clients', (
      SELECT count(*) FROM clients
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND created_at >= v_year_start AND created_at <= v_year_end
    ),
    'year_completed', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND updated_at >= v_year_start AND updated_at <= v_year_end
    ),
    -- EXTERNAL PLATFORM ENTRIES
    'today_ext_revenue', (
      SELECT COALESCE(sum(revenue), 0) FROM driver_daily_entries
      WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date = v_today_start::date
    ),
    'today_ext_courses', (
      SELECT COALESCE(sum(courses_count), 0) FROM driver_daily_entries
      WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date = v_today_start::date
    ),
    'week_ext_revenue', (
      SELECT COALESCE(sum(revenue), 0) FROM driver_daily_entries
      WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_week_start::date AND entry_date <= v_week_end::date
    ),
    'week_ext_courses', (
      SELECT COALESCE(sum(courses_count), 0) FROM driver_daily_entries
      WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_week_start::date AND entry_date <= v_week_end::date
    ),
    'month_ext_revenue', (
      SELECT COALESCE(sum(revenue), 0) FROM driver_daily_entries
      WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_month_start::date AND entry_date <= v_month_end::date
    ),
    'month_ext_courses', (
      SELECT COALESCE(sum(courses_count), 0) FROM driver_daily_entries
      WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_month_start::date AND entry_date <= v_month_end::date
    ),
    'year_ext_revenue', (
      SELECT COALESCE(sum(revenue), 0) FROM driver_daily_entries
      WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_year_start::date AND entry_date <= v_year_end::date
    ),
    'year_ext_courses', (
      SELECT COALESCE(sum(courses_count), 0) FROM driver_daily_entries
      WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_year_start::date AND entry_date <= v_year_end::date
    )
  ) INTO result;

  RETURN result;
END;
$$;
