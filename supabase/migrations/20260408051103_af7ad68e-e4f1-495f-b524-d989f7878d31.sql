
CREATE OR REPLACE FUNCTION public.get_driver_revenue_details(
  p_driver_id uuid,
  p_period text -- 'daily', 'weekly', 'monthly', 'yearly'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result json;
  v_now timestamptz := timezone('Europe/Paris', now());
  v_today date := v_now::date;
BEGIN
  IF p_period = 'daily' THEN
    -- Hourly breakdown of today
    WITH hours AS (
      SELECT generate_series(0, 23) AS hr
    ),
    course_data AS (
      SELECT
        EXTRACT(HOUR FROM timezone('Europe/Paris', COALESCE(c.scheduled_date, c.payment_confirmed_at, c.updated_at, c.created_at)))::int AS hr,
        COALESCE(c.final_payment_amount, c.guest_estimated_price, 0)::numeric AS revenue,
        c.id
      FROM courses c
      WHERE (c.driver_id = p_driver_id OR p_driver_id = ANY(COALESCE(c.driver_ids, '{}'::uuid[])))
        AND c.status = 'completed'
        AND (timezone('Europe/Paris', COALESCE(c.scheduled_date, c.payment_confirmed_at, c.updated_at, c.created_at)))::date = v_today
        AND COALESCE(c.final_payment_amount, c.guest_estimated_price, 0) > 0
    )
    SELECT json_agg(row_to_json(r) ORDER BY r.label)
    INTO result
    FROM (
      SELECT
        h.hr::text || 'h' AS label,
        COALESCE(SUM(cd.revenue), 0)::numeric AS revenue,
        COUNT(cd.id)::int AS courses
      FROM hours h
      LEFT JOIN course_data cd ON cd.hr = h.hr
      WHERE h.hr <= EXTRACT(HOUR FROM v_now)::int
      GROUP BY h.hr
    ) r;

  ELSIF p_period = 'weekly' THEN
    -- Daily breakdown of current week
    WITH days AS (
      SELECT generate_series(
        date_trunc('week', v_now)::date,
        (date_trunc('week', v_now)::date + 6),
        '1 day'::interval
      )::date AS d
    ),
    course_data AS (
      SELECT
        (timezone('Europe/Paris', COALESCE(c.scheduled_date, c.payment_confirmed_at, c.updated_at, c.created_at)))::date AS d,
        COALESCE(c.final_payment_amount, c.guest_estimated_price, 0)::numeric AS revenue,
        c.id
      FROM courses c
      WHERE (c.driver_id = p_driver_id OR p_driver_id = ANY(COALESCE(c.driver_ids, '{}'::uuid[])))
        AND c.status = 'completed'
        AND (timezone('Europe/Paris', COALESCE(c.scheduled_date, c.payment_confirmed_at, c.updated_at, c.created_at)))::date
            BETWEEN date_trunc('week', v_now)::date AND (date_trunc('week', v_now)::date + 6)
        AND COALESCE(c.final_payment_amount, c.guest_estimated_price, 0) > 0
    )
    SELECT json_agg(row_to_json(r) ORDER BY r.sort_key)
    INTO result
    FROM (
      SELECT
        to_char(days.d, 'Dy DD/MM') AS label,
        days.d AS sort_key,
        COALESCE(SUM(cd.revenue), 0)::numeric AS revenue,
        COUNT(cd.id)::int AS courses
      FROM days
      LEFT JOIN course_data cd ON cd.d = days.d
      GROUP BY days.d
    ) r;

  ELSIF p_period = 'monthly' THEN
    -- Weekly breakdown of current month
    WITH weeks AS (
      SELECT
        gs AS week_start,
        LEAST(gs + 6, (date_trunc('month', v_now) + interval '1 month' - interval '1 day')::date) AS week_end,
        ROW_NUMBER() OVER (ORDER BY gs) AS week_num
      FROM generate_series(
        date_trunc('month', v_now)::date,
        (date_trunc('month', v_now) + interval '1 month' - interval '1 day')::date,
        '7 days'::interval
      ) gs(gs)
    ),
    course_data AS (
      SELECT
        (timezone('Europe/Paris', COALESCE(c.scheduled_date, c.payment_confirmed_at, c.updated_at, c.created_at)))::date AS d,
        COALESCE(c.final_payment_amount, c.guest_estimated_price, 0)::numeric AS revenue,
        c.id
      FROM courses c
      WHERE (c.driver_id = p_driver_id OR p_driver_id = ANY(COALESCE(c.driver_ids, '{}'::uuid[])))
        AND c.status = 'completed'
        AND (timezone('Europe/Paris', COALESCE(c.scheduled_date, c.payment_confirmed_at, c.updated_at, c.created_at)))::date
            BETWEEN date_trunc('month', v_now)::date AND (date_trunc('month', v_now) + interval '1 month' - interval '1 day')::date
        AND COALESCE(c.final_payment_amount, c.guest_estimated_price, 0) > 0
    )
    SELECT json_agg(row_to_json(r) ORDER BY r.sort_key)
    INTO result
    FROM (
      SELECT
        'Sem ' || w.week_num || ' (' || to_char(w.week_start::date, 'DD/MM') || ')' AS label,
        w.week_start AS sort_key,
        COALESCE(SUM(cd.revenue), 0)::numeric AS revenue,
        COUNT(cd.id)::int AS courses
      FROM weeks w
      LEFT JOIN course_data cd ON cd.d BETWEEN w.week_start::date AND w.week_end::date
      GROUP BY w.week_num, w.week_start, w.week_end
    ) r;

  ELSIF p_period = 'yearly' THEN
    -- Monthly breakdown of current year
    WITH months AS (
      SELECT generate_series(1, 12) AS m
    ),
    course_data AS (
      SELECT
        EXTRACT(MONTH FROM timezone('Europe/Paris', COALESCE(c.scheduled_date, c.payment_confirmed_at, c.updated_at, c.created_at)))::int AS m,
        COALESCE(c.final_payment_amount, c.guest_estimated_price, 0)::numeric AS revenue,
        c.id
      FROM courses c
      WHERE (c.driver_id = p_driver_id OR p_driver_id = ANY(COALESCE(c.driver_ids, '{}'::uuid[])))
        AND c.status = 'completed'
        AND EXTRACT(YEAR FROM timezone('Europe/Paris', COALESCE(c.scheduled_date, c.payment_confirmed_at, c.updated_at, c.created_at))) = EXTRACT(YEAR FROM v_now)
        AND COALESCE(c.final_payment_amount, c.guest_estimated_price, 0) > 0
    )
    SELECT json_agg(row_to_json(r) ORDER BY r.sort_key)
    INTO result
    FROM (
      SELECT
        to_char(make_date(EXTRACT(YEAR FROM v_now)::int, months.m, 1), 'Mon') AS label,
        months.m AS sort_key,
        COALESCE(SUM(cd.revenue), 0)::numeric AS revenue,
        COUNT(cd.id)::int AS courses
      FROM months
      LEFT JOIN course_data cd ON cd.m = months.m
      WHERE months.m <= EXTRACT(MONTH FROM v_now)::int
      GROUP BY months.m
    ) r;
  END IF;

  RETURN COALESCE(result, '[]'::json);
END;
$$;
