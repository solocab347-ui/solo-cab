-- 1) Harden and normalize driver dashboard stats aggregation for all drivers
CREATE OR REPLACE FUNCTION public.get_driver_dashboard_stats(p_driver_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_today_start timestamptz := date_trunc('day', now());
  v_today_end timestamptz := date_trunc('day', now()) + interval '1 day' - interval '1 millisecond';
  v_week_start timestamptz := date_trunc('week', now());
  v_week_end timestamptz := date_trunc('week', now()) + interval '7 days' - interval '1 millisecond';
  v_month_start timestamptz := date_trunc('month', now());
  v_month_end timestamptz := date_trunc('month', now()) + interval '1 month' - interval '1 millisecond';
  v_year_start timestamptz := date_trunc('year', now());
  v_year_end timestamptz := date_trunc('year', now()) + interval '1 year' - interval '1 millisecond';
BEGIN
  WITH course_scope AS (
    SELECT
      c.id,
      c.status,
      c.scheduled_date,
      COALESCE(c.final_payment_amount, c.guest_estimated_price, dq.amount, 0) AS effective_revenue,
      COALESCE(c.duration_minutes, 0)::numeric AS duration_minutes,
      COALESCE(c.distance_km, 0)::numeric AS distance_km
    FROM public.courses c
    LEFT JOIN LATERAL (
      SELECT d.amount
      FROM public.devis d
      WHERE d.course_id = c.id
        AND d.status = 'accepted'
        AND d.amount IS NOT NULL
      ORDER BY d.updated_at DESC NULLS LAST, d.created_at DESC NULLS LAST
      LIMIT 1
    ) dq ON TRUE
    WHERE (c.driver_id = p_driver_id OR p_driver_id = ANY(COALESCE(c.driver_ids, '{}'::uuid[])))
  ),
  client_scope AS (
    SELECT created_at
    FROM public.clients
    WHERE (driver_id = p_driver_id OR p_driver_id = ANY(COALESCE(driver_ids, '{}'::uuid[])))
  ),
  external_scope AS (
    SELECT
      entry_date,
      COALESCE(revenue, 0)::numeric AS revenue,
      COALESCE(courses_count, 0)::int AS courses_count,
      COALESCE(hours_worked, 0)::numeric AS hours_worked,
      COALESCE(km_driven, 0)::numeric AS km_driven,
      COALESCE(new_clients_count, 0)::int AS new_clients_count
    FROM public.driver_daily_entries
    WHERE driver_id = p_driver_id
      AND COALESCE(is_solocab, false) = false
  )
  SELECT json_build_object(
    'today_courses', COALESCE((SELECT count(*) FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_today_start AND v_today_end), 0),
    'today_revenue', COALESCE((SELECT sum(effective_revenue) FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_today_start AND v_today_end), 0),
    'today_clients', COALESCE((SELECT count(*) FROM client_scope WHERE created_at BETWEEN v_today_start AND v_today_end), 0),
    'today_hours', COALESCE((SELECT sum(duration_minutes) / 60.0 FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_today_start AND v_today_end), 0),
    'today_km', COALESCE((SELECT sum(distance_km) FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_today_start AND v_today_end), 0),

    'week_courses', COALESCE((SELECT count(*) FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_week_start AND v_week_end), 0),
    'week_revenue', COALESCE((SELECT sum(effective_revenue) FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_week_start AND v_week_end), 0),
    'week_clients', COALESCE((SELECT count(*) FROM client_scope WHERE created_at BETWEEN v_week_start AND v_week_end), 0),
    'week_hours', COALESCE((SELECT sum(duration_minutes) / 60.0 FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_week_start AND v_week_end), 0),
    'week_km', COALESCE((SELECT sum(distance_km) FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_week_start AND v_week_end), 0),

    'month_courses', COALESCE((SELECT count(*) FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_month_start AND v_month_end), 0),
    'month_revenue', COALESCE((SELECT sum(effective_revenue) FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_month_start AND v_month_end), 0),
    'month_clients', COALESCE((SELECT count(*) FROM client_scope WHERE created_at BETWEEN v_month_start AND v_month_end), 0),
    'month_hours', COALESCE((SELECT sum(duration_minutes) / 60.0 FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_month_start AND v_month_end), 0),
    'month_km', COALESCE((SELECT sum(distance_km) FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_month_start AND v_month_end), 0),
    'month_completed', COALESCE((SELECT count(*) FROM course_scope WHERE status = 'completed'), 0),

    'year_courses', COALESCE((SELECT count(*) FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_year_start AND v_year_end), 0),
    'year_revenue', COALESCE((SELECT sum(effective_revenue) FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_year_start AND v_year_end), 0),
    'year_clients', COALESCE((SELECT count(*) FROM client_scope WHERE created_at BETWEEN v_year_start AND v_year_end), 0),
    'year_hours', COALESCE((SELECT sum(duration_minutes) / 60.0 FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_year_start AND v_year_end), 0),
    'year_km', COALESCE((SELECT sum(distance_km) FROM course_scope WHERE status = 'completed' AND scheduled_date BETWEEN v_year_start AND v_year_end), 0),
    'year_completed', COALESCE((SELECT count(*) FROM course_scope WHERE status = 'completed'), 0),

    'today_ext_revenue', COALESCE((SELECT sum(revenue) FROM external_scope WHERE entry_date = CURRENT_DATE), 0),
    'today_ext_courses', COALESCE((SELECT sum(courses_count) FROM external_scope WHERE entry_date = CURRENT_DATE), 0),
    'today_ext_hours', COALESCE((SELECT sum(hours_worked) FROM external_scope WHERE entry_date = CURRENT_DATE), 0),
    'today_ext_km', COALESCE((SELECT sum(km_driven) FROM external_scope WHERE entry_date = CURRENT_DATE), 0),
    'today_ext_clients', COALESCE((SELECT sum(new_clients_count) FROM external_scope WHERE entry_date = CURRENT_DATE), 0),

    'week_ext_revenue', COALESCE((SELECT sum(revenue) FROM external_scope WHERE entry_date BETWEEN v_week_start::date AND v_week_end::date), 0),
    'week_ext_courses', COALESCE((SELECT sum(courses_count) FROM external_scope WHERE entry_date BETWEEN v_week_start::date AND v_week_end::date), 0),
    'week_ext_hours', COALESCE((SELECT sum(hours_worked) FROM external_scope WHERE entry_date BETWEEN v_week_start::date AND v_week_end::date), 0),
    'week_ext_km', COALESCE((SELECT sum(km_driven) FROM external_scope WHERE entry_date BETWEEN v_week_start::date AND v_week_end::date), 0),
    'week_ext_clients', COALESCE((SELECT sum(new_clients_count) FROM external_scope WHERE entry_date BETWEEN v_week_start::date AND v_week_end::date), 0),

    'month_ext_revenue', COALESCE((SELECT sum(revenue) FROM external_scope WHERE entry_date BETWEEN v_month_start::date AND v_month_end::date), 0),
    'month_ext_courses', COALESCE((SELECT sum(courses_count) FROM external_scope WHERE entry_date BETWEEN v_month_start::date AND v_month_end::date), 0),
    'month_ext_hours', COALESCE((SELECT sum(hours_worked) FROM external_scope WHERE entry_date BETWEEN v_month_start::date AND v_month_end::date), 0),
    'month_ext_km', COALESCE((SELECT sum(km_driven) FROM external_scope WHERE entry_date BETWEEN v_month_start::date AND v_month_end::date), 0),
    'month_ext_clients', COALESCE((SELECT sum(new_clients_count) FROM external_scope WHERE entry_date BETWEEN v_month_start::date AND v_month_end::date), 0),

    'year_ext_revenue', COALESCE((SELECT sum(revenue) FROM external_scope WHERE entry_date BETWEEN v_year_start::date AND v_year_end::date), 0),
    'year_ext_courses', COALESCE((SELECT sum(courses_count) FROM external_scope WHERE entry_date BETWEEN v_year_start::date AND v_year_end::date), 0),
    'year_ext_hours', COALESCE((SELECT sum(hours_worked) FROM external_scope WHERE entry_date BETWEEN v_year_start::date AND v_year_end::date), 0),
    'year_ext_km', COALESCE((SELECT sum(km_driven) FROM external_scope WHERE entry_date BETWEEN v_year_start::date AND v_year_end::date), 0),
    'year_ext_clients', COALESCE((SELECT sum(new_clients_count) FROM external_scope WHERE entry_date BETWEEN v_year_start::date AND v_year_end::date), 0)
  )
  INTO result;

  RETURN result;
END;
$$;

-- 2) Backfill missing final payment amounts for historical completed courses (all drivers)
WITH latest_accepted_devis AS (
  SELECT DISTINCT ON (d.course_id)
    d.course_id,
    d.amount
  FROM public.devis d
  WHERE d.status = 'accepted'
    AND d.amount IS NOT NULL
  ORDER BY d.course_id, d.updated_at DESC NULLS LAST, d.created_at DESC NULLS LAST
)
UPDATE public.courses c
SET final_payment_amount = lad.amount
FROM latest_accepted_devis lad
WHERE c.id = lad.course_id
  AND c.status = 'completed'
  AND c.final_payment_amount IS NULL;

-- 3) Guarantee future consistency for new completed courses
CREATE OR REPLACE FUNCTION public.auto_set_final_payment_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
BEGIN
  IF NEW.status = 'completed' AND NEW.final_payment_amount IS NULL THEN
    SELECT d.amount
    INTO v_amount
    FROM public.devis d
    WHERE d.course_id = NEW.id
      AND d.status = 'accepted'
      AND d.amount IS NOT NULL
    ORDER BY d.updated_at DESC NULLS LAST, d.created_at DESC NULLS LAST
    LIMIT 1;

    IF v_amount IS NOT NULL THEN
      NEW.final_payment_amount := v_amount;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_set_final_payment ON public.courses;
CREATE TRIGGER trg_auto_set_final_payment
BEFORE INSERT OR UPDATE OF status, final_payment_amount
ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.auto_set_final_payment_amount();