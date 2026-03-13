CREATE OR REPLACE FUNCTION public.get_driver_dashboard_stats(p_driver_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  v_today_date date := (timezone('Europe/Paris', now()))::date;
  v_week_start date := date_trunc('week', timezone('Europe/Paris', now()))::date;
  v_week_end date := (date_trunc('week', timezone('Europe/Paris', now()))::date + 6);
  v_month_start date := date_trunc('month', timezone('Europe/Paris', now()))::date;
  v_month_end date := (date_trunc('month', timezone('Europe/Paris', now()) + interval '1 month')::date - 1);
  v_year_start date := date_trunc('year', timezone('Europe/Paris', now()))::date;
  v_year_end date := (date_trunc('year', timezone('Europe/Paris', now()) + interval '1 year')::date - 1);
BEGIN
  WITH direct_completed AS (
    SELECT
      c.id AS course_id,
      (timezone('Europe/Paris', COALESCE(c.scheduled_date, c.payment_confirmed_at, c.created_at)))::date AS activity_day,
      COALESCE(c.final_payment_amount, c.guest_estimated_price, dq.amount, 0)::numeric AS effective_revenue,
      COALESCE(c.duration_minutes, 0)::numeric AS duration_minutes,
      COALESCE(c.distance_km, 0)::numeric AS distance_km,
      1 AS source_priority
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
      AND c.status = 'completed'
  ),
  shared_completed AS (
    SELECT
      sc.course_id,
      (timezone('Europe/Paris', COALESCE(sc.completed_at, c.scheduled_date, c.payment_confirmed_at, c.created_at, sc.created_at)))::date AS activity_day,
      COALESCE(sc.earnings_for_receiver, c.final_payment_amount, c.guest_estimated_price, dq.amount, sc.course_amount, 0)::numeric AS effective_revenue,
      COALESCE(c.duration_minutes, 0)::numeric AS duration_minutes,
      COALESCE(c.distance_km, 0)::numeric AS distance_km,
      2 AS source_priority
    FROM public.shared_courses sc
    JOIN public.courses c ON c.id = sc.course_id
    LEFT JOIN LATERAL (
      SELECT d.amount
      FROM public.devis d
      WHERE d.course_id = c.id
        AND d.status = 'accepted'
        AND d.amount IS NOT NULL
      ORDER BY d.updated_at DESC NULLS LAST, d.created_at DESC NULLS LAST
      LIMIT 1
    ) dq ON TRUE
    WHERE sc.receiver_driver_id = p_driver_id
      AND sc.status = 'completed'
      AND c.status = 'completed'
  ),
  platform_completed_scope AS (
    SELECT DISTINCT ON (merged.course_id)
      merged.course_id,
      merged.activity_day,
      merged.effective_revenue,
      merged.duration_minutes,
      merged.distance_km
    FROM (
      SELECT * FROM direct_completed
      UNION ALL
      SELECT * FROM shared_completed
    ) merged
    ORDER BY merged.course_id, merged.source_priority
  ),
  client_scope AS (
    SELECT
      (timezone('Europe/Paris', created_at))::date AS created_day
    FROM public.clients
    WHERE (driver_id = p_driver_id OR p_driver_id = ANY(COALESCE(driver_ids, '{}'::uuid[])))
  ),
  external_dedup AS (
    SELECT
      e.entry_date,
      COALESCE(e.platform_id, '00000000-0000-0000-0000-000000000000'::uuid) AS platform_key,
      COALESCE(e.revenue, 0)::numeric AS revenue,
      COALESCE(e.courses_count, 0)::int AS courses_count,
      COALESCE(e.hours_worked, 0)::numeric AS hours_worked,
      COALESCE(e.km_driven, 0)::numeric AS km_driven,
      COALESCE(e.new_clients_count, 0)::int AS new_clients_count,
      ROW_NUMBER() OVER (
        PARTITION BY e.entry_date, COALESCE(e.platform_id, '00000000-0000-0000-0000-000000000000'::uuid)
        ORDER BY e.updated_at DESC NULLS LAST, e.created_at DESC NULLS LAST, e.id DESC
      ) AS rn
    FROM public.driver_daily_entries e
    WHERE e.driver_id = p_driver_id
      AND COALESCE(e.is_solocab, false) = false
  ),
  external_scope AS (
    SELECT
      entry_date,
      SUM(revenue)::numeric AS revenue,
      SUM(courses_count)::int AS courses_count,
      SUM(hours_worked)::numeric AS hours_worked,
      SUM(km_driven)::numeric AS km_driven,
      SUM(new_clients_count)::int AS new_clients_count
    FROM external_dedup
    WHERE rn = 1
    GROUP BY entry_date
  ),
  platform_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE activity_day = v_today_date) AS today_courses,
      COALESCE(SUM(effective_revenue) FILTER (WHERE activity_day = v_today_date), 0) AS today_revenue,
      COALESCE(SUM(duration_minutes) FILTER (WHERE activity_day = v_today_date), 0) / 60.0 AS today_hours,
      COALESCE(SUM(distance_km) FILTER (WHERE activity_day = v_today_date), 0) AS today_km,

      COUNT(*) FILTER (WHERE activity_day BETWEEN v_week_start AND v_week_end) AS week_courses,
      COALESCE(SUM(effective_revenue) FILTER (WHERE activity_day BETWEEN v_week_start AND v_week_end), 0) AS week_revenue,
      COALESCE(SUM(duration_minutes) FILTER (WHERE activity_day BETWEEN v_week_start AND v_week_end), 0) / 60.0 AS week_hours,
      COALESCE(SUM(distance_km) FILTER (WHERE activity_day BETWEEN v_week_start AND v_week_end), 0) AS week_km,

      COUNT(*) FILTER (WHERE activity_day BETWEEN v_month_start AND v_month_end) AS month_courses,
      COALESCE(SUM(effective_revenue) FILTER (WHERE activity_day BETWEEN v_month_start AND v_month_end), 0) AS month_revenue,
      COALESCE(SUM(duration_minutes) FILTER (WHERE activity_day BETWEEN v_month_start AND v_month_end), 0) / 60.0 AS month_hours,
      COALESCE(SUM(distance_km) FILTER (WHERE activity_day BETWEEN v_month_start AND v_month_end), 0) AS month_km,
      COUNT(*) FILTER (WHERE activity_day BETWEEN v_month_start AND v_month_end) AS month_completed,

      COUNT(*) FILTER (WHERE activity_day BETWEEN v_year_start AND v_year_end) AS year_courses,
      COALESCE(SUM(effective_revenue) FILTER (WHERE activity_day BETWEEN v_year_start AND v_year_end), 0) AS year_revenue,
      COALESCE(SUM(duration_minutes) FILTER (WHERE activity_day BETWEEN v_year_start AND v_year_end), 0) / 60.0 AS year_hours,
      COALESCE(SUM(distance_km) FILTER (WHERE activity_day BETWEEN v_year_start AND v_year_end), 0) AS year_km,
      COUNT(*) FILTER (WHERE activity_day BETWEEN v_year_start AND v_year_end) AS year_completed
    FROM platform_completed_scope
  ),
  client_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE created_day = v_today_date) AS today_clients,
      COUNT(*) FILTER (WHERE created_day BETWEEN v_week_start AND v_week_end) AS week_clients,
      COUNT(*) FILTER (WHERE created_day BETWEEN v_month_start AND v_month_end) AS month_clients,
      COUNT(*) FILTER (WHERE created_day BETWEEN v_year_start AND v_year_end) AS year_clients
    FROM client_scope
  ),
  external_agg AS (
    SELECT
      COALESCE(SUM(revenue) FILTER (WHERE entry_date = v_today_date), 0) AS today_ext_revenue,
      COALESCE(SUM(courses_count) FILTER (WHERE entry_date = v_today_date), 0) AS today_ext_courses,
      COALESCE(SUM(hours_worked) FILTER (WHERE entry_date = v_today_date), 0) AS today_ext_hours,
      COALESCE(SUM(km_driven) FILTER (WHERE entry_date = v_today_date), 0) AS today_ext_km,
      COALESCE(SUM(new_clients_count) FILTER (WHERE entry_date = v_today_date), 0) AS today_ext_clients,

      COALESCE(SUM(revenue) FILTER (WHERE entry_date BETWEEN v_week_start AND v_week_end), 0) AS week_ext_revenue,
      COALESCE(SUM(courses_count) FILTER (WHERE entry_date BETWEEN v_week_start AND v_week_end), 0) AS week_ext_courses,
      COALESCE(SUM(hours_worked) FILTER (WHERE entry_date BETWEEN v_week_start AND v_week_end), 0) AS week_ext_hours,
      COALESCE(SUM(km_driven) FILTER (WHERE entry_date BETWEEN v_week_start AND v_week_end), 0) AS week_ext_km,
      COALESCE(SUM(new_clients_count) FILTER (WHERE entry_date BETWEEN v_week_start AND v_week_end), 0) AS week_ext_clients,

      COALESCE(SUM(revenue) FILTER (WHERE entry_date BETWEEN v_month_start AND v_month_end), 0) AS month_ext_revenue,
      COALESCE(SUM(courses_count) FILTER (WHERE entry_date BETWEEN v_month_start AND v_month_end), 0) AS month_ext_courses,
      COALESCE(SUM(hours_worked) FILTER (WHERE entry_date BETWEEN v_month_start AND v_month_end), 0) AS month_ext_hours,
      COALESCE(SUM(km_driven) FILTER (WHERE entry_date BETWEEN v_month_start AND v_month_end), 0) AS month_ext_km,
      COALESCE(SUM(new_clients_count) FILTER (WHERE entry_date BETWEEN v_month_start AND v_month_end), 0) AS month_ext_clients,

      COALESCE(SUM(revenue) FILTER (WHERE entry_date BETWEEN v_year_start AND v_year_end), 0) AS year_ext_revenue,
      COALESCE(SUM(courses_count) FILTER (WHERE entry_date BETWEEN v_year_start AND v_year_end), 0) AS year_ext_courses,
      COALESCE(SUM(hours_worked) FILTER (WHERE entry_date BETWEEN v_year_start AND v_year_end), 0) AS year_ext_hours,
      COALESCE(SUM(km_driven) FILTER (WHERE entry_date BETWEEN v_year_start AND v_year_end), 0) AS year_ext_km,
      COALESCE(SUM(new_clients_count) FILTER (WHERE entry_date BETWEEN v_year_start AND v_year_end), 0) AS year_ext_clients
    FROM external_scope
  )
  SELECT json_build_object(
    'today_courses', pa.today_courses,
    'today_revenue', pa.today_revenue,
    'today_clients', ca.today_clients,
    'today_hours', pa.today_hours,
    'today_km', pa.today_km,

    'week_courses', pa.week_courses,
    'week_revenue', pa.week_revenue,
    'week_clients', ca.week_clients,
    'week_hours', pa.week_hours,
    'week_km', pa.week_km,

    'month_courses', pa.month_courses,
    'month_revenue', pa.month_revenue,
    'month_clients', ca.month_clients,
    'month_hours', pa.month_hours,
    'month_km', pa.month_km,
    'month_completed', pa.month_completed,

    'year_courses', pa.year_courses,
    'year_revenue', pa.year_revenue,
    'year_clients', ca.year_clients,
    'year_hours', pa.year_hours,
    'year_km', pa.year_km,
    'year_completed', pa.year_completed,

    'today_ext_revenue', ea.today_ext_revenue,
    'today_ext_courses', ea.today_ext_courses,
    'today_ext_hours', ea.today_ext_hours,
    'today_ext_km', ea.today_ext_km,
    'today_ext_clients', ea.today_ext_clients,

    'week_ext_revenue', ea.week_ext_revenue,
    'week_ext_courses', ea.week_ext_courses,
    'week_ext_hours', ea.week_ext_hours,
    'week_ext_km', ea.week_ext_km,
    'week_ext_clients', ea.week_ext_clients,

    'month_ext_revenue', ea.month_ext_revenue,
    'month_ext_courses', ea.month_ext_courses,
    'month_ext_hours', ea.month_ext_hours,
    'month_ext_km', ea.month_ext_km,
    'month_ext_clients', ea.month_ext_clients,

    'year_ext_revenue', ea.year_ext_revenue,
    'year_ext_courses', ea.year_ext_courses,
    'year_ext_hours', ea.year_ext_hours,
    'year_ext_km', ea.year_ext_km,
    'year_ext_clients', ea.year_ext_clients
  )
  INTO result
  FROM platform_agg pa
  CROSS JOIN client_agg ca
  CROSS JOIN external_agg ea;

  RETURN result;
END;
$$;