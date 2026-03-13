
-- 1. UPDATE RPC: Fall back to devis.amount when both price fields are NULL
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
  v_week_start := date_trunc('week', now());
  v_week_end := v_week_start + interval '7 days' - interval '1 millisecond';
  v_month_start := date_trunc('month', now());
  v_month_end := (v_month_start + interval '1 month') - interval '1 millisecond';
  v_year_start := date_trunc('year', now());
  v_year_end := (v_year_start + interval '1 year') - interval '1 millisecond';

  SELECT json_build_object(
    'today_courses', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_today_start AND scheduled_date <= v_today_end
    ),
    'today_revenue', (
      SELECT COALESCE(sum(
        COALESCE(c.final_payment_amount, c.guest_estimated_price, (SELECT d.amount FROM devis d WHERE d.course_id = c.id AND d.status = 'accepted' LIMIT 1), 0)
      ), 0) FROM courses c
      WHERE (c.driver_id = p_driver_id OR p_driver_id = ANY(c.driver_ids))
        AND c.status = 'completed'
        AND c.scheduled_date >= v_today_start AND c.scheduled_date <= v_today_end
    ),
    'today_clients', (
      SELECT count(*) FROM clients
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND created_at >= v_today_start AND created_at <= v_today_end
    ),
    'today_hours', (
      SELECT COALESCE(sum(COALESCE(duration_minutes, 0)) / 60.0, 0) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_today_start AND scheduled_date <= v_today_end
    ),
    'today_km', (
      SELECT COALESCE(sum(COALESCE(distance_km, 0)), 0) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_today_start AND scheduled_date <= v_today_end
    ),
    'week_courses', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_week_start AND scheduled_date <= v_week_end
    ),
    'week_revenue', (
      SELECT COALESCE(sum(
        COALESCE(c.final_payment_amount, c.guest_estimated_price, (SELECT d.amount FROM devis d WHERE d.course_id = c.id AND d.status = 'accepted' LIMIT 1), 0)
      ), 0) FROM courses c
      WHERE (c.driver_id = p_driver_id OR p_driver_id = ANY(c.driver_ids))
        AND c.status = 'completed'
        AND c.scheduled_date >= v_week_start AND c.scheduled_date <= v_week_end
    ),
    'week_clients', (
      SELECT count(*) FROM clients
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND created_at >= v_week_start AND created_at <= v_week_end
    ),
    'week_hours', (
      SELECT COALESCE(sum(COALESCE(duration_minutes, 0)) / 60.0, 0) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_week_start AND scheduled_date <= v_week_end
    ),
    'week_km', (
      SELECT COALESCE(sum(COALESCE(distance_km, 0)), 0) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_week_start AND scheduled_date <= v_week_end
    ),
    'month_courses', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_month_start AND scheduled_date <= v_month_end
    ),
    'month_revenue', (
      SELECT COALESCE(sum(
        COALESCE(c.final_payment_amount, c.guest_estimated_price, (SELECT d.amount FROM devis d WHERE d.course_id = c.id AND d.status = 'accepted' LIMIT 1), 0)
      ), 0) FROM courses c
      WHERE (c.driver_id = p_driver_id OR p_driver_id = ANY(c.driver_ids))
        AND c.status = 'completed'
        AND c.scheduled_date >= v_month_start AND c.scheduled_date <= v_month_end
    ),
    'month_clients', (
      SELECT count(*) FROM clients
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND created_at >= v_month_start AND created_at <= v_month_end
    ),
    'month_hours', (
      SELECT COALESCE(sum(COALESCE(duration_minutes, 0)) / 60.0, 0) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_month_start AND scheduled_date <= v_month_end
    ),
    'month_km', (
      SELECT COALESCE(sum(COALESCE(distance_km, 0)), 0) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_month_start AND scheduled_date <= v_month_end
    ),
    'month_completed', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND updated_at >= v_month_start AND updated_at <= v_month_end
    ),
    'year_courses', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_year_start AND scheduled_date <= v_year_end
    ),
    'year_revenue', (
      SELECT COALESCE(sum(
        COALESCE(c.final_payment_amount, c.guest_estimated_price, (SELECT d.amount FROM devis d WHERE d.course_id = c.id AND d.status = 'accepted' LIMIT 1), 0)
      ), 0) FROM courses c
      WHERE (c.driver_id = p_driver_id OR p_driver_id = ANY(c.driver_ids))
        AND c.status = 'completed'
        AND c.scheduled_date >= v_year_start AND c.scheduled_date <= v_year_end
    ),
    'year_clients', (
      SELECT count(*) FROM clients
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND created_at >= v_year_start AND created_at <= v_year_end
    ),
    'year_hours', (
      SELECT COALESCE(sum(COALESCE(duration_minutes, 0)) / 60.0, 0) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_year_start AND scheduled_date <= v_year_end
    ),
    'year_km', (
      SELECT COALESCE(sum(COALESCE(distance_km, 0)), 0) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND scheduled_date >= v_year_start AND scheduled_date <= v_year_end
    ),
    'year_completed', (
      SELECT count(*) FROM courses
      WHERE (driver_id = p_driver_id OR p_driver_id = ANY(driver_ids))
        AND status = 'completed'
        AND updated_at >= v_year_start AND updated_at <= v_year_end
    ),
    -- EXTERNAL PLATFORM ENTRIES
    'today_ext_revenue', (SELECT COALESCE(sum(revenue), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date = v_today_start::date),
    'today_ext_courses', (SELECT COALESCE(sum(courses_count), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date = v_today_start::date),
    'today_ext_hours', (SELECT COALESCE(sum(hours_worked), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date = v_today_start::date),
    'today_ext_km', (SELECT COALESCE(sum(km_driven), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date = v_today_start::date),
    'today_ext_clients', (SELECT COALESCE(sum(new_clients_count), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date = v_today_start::date),
    'week_ext_revenue', (SELECT COALESCE(sum(revenue), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_week_start::date AND entry_date <= v_week_end::date),
    'week_ext_courses', (SELECT COALESCE(sum(courses_count), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_week_start::date AND entry_date <= v_week_end::date),
    'week_ext_hours', (SELECT COALESCE(sum(hours_worked), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_week_start::date AND entry_date <= v_week_end::date),
    'week_ext_km', (SELECT COALESCE(sum(km_driven), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_week_start::date AND entry_date <= v_week_end::date),
    'week_ext_clients', (SELECT COALESCE(sum(new_clients_count), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_week_start::date AND entry_date <= v_week_end::date),
    'month_ext_revenue', (SELECT COALESCE(sum(revenue), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_month_start::date AND entry_date <= v_month_end::date),
    'month_ext_courses', (SELECT COALESCE(sum(courses_count), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_month_start::date AND entry_date <= v_month_end::date),
    'month_ext_hours', (SELECT COALESCE(sum(hours_worked), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_month_start::date AND entry_date <= v_month_end::date),
    'month_ext_km', (SELECT COALESCE(sum(km_driven), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_month_start::date AND entry_date <= v_month_end::date),
    'month_ext_clients', (SELECT COALESCE(sum(new_clients_count), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_month_start::date AND entry_date <= v_month_end::date),
    'year_ext_revenue', (SELECT COALESCE(sum(revenue), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_year_start::date AND entry_date <= v_year_end::date),
    'year_ext_courses', (SELECT COALESCE(sum(courses_count), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_year_start::date AND entry_date <= v_year_end::date),
    'year_ext_hours', (SELECT COALESCE(sum(hours_worked), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_year_start::date AND entry_date <= v_year_end::date),
    'year_ext_km', (SELECT COALESCE(sum(km_driven), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_year_start::date AND entry_date <= v_year_end::date),
    'year_ext_clients', (SELECT COALESCE(sum(new_clients_count), 0) FROM driver_daily_entries WHERE driver_id = p_driver_id AND is_solocab = false AND entry_date >= v_year_start::date AND entry_date <= v_year_end::date)
  ) INTO result;

  RETURN result;
END;
$$;

-- 2. Trigger to auto-set final_payment_amount from devis when course is completed
CREATE OR REPLACE FUNCTION auto_set_final_payment_from_devis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.final_payment_amount IS NULL THEN
    SELECT d.amount INTO NEW.final_payment_amount
    FROM devis d
    WHERE d.course_id = NEW.id AND d.status = 'accepted'
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_set_final_payment ON courses;
CREATE TRIGGER trg_auto_set_final_payment
  BEFORE UPDATE ON courses
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION auto_set_final_payment_from_devis();

-- 3. Backfill using direct UPDATE bypassing guest validation trigger
ALTER TABLE courses DISABLE TRIGGER validate_guest_booking_trigger;

UPDATE courses c
SET final_payment_amount = d.amount
FROM devis d
WHERE d.course_id = c.id
  AND d.status = 'accepted'
  AND c.status = 'completed'
  AND c.final_payment_amount IS NULL
  AND c.guest_estimated_price IS NULL
  AND d.amount IS NOT NULL;

ALTER TABLE courses ENABLE TRIGGER validate_guest_booking_trigger;
