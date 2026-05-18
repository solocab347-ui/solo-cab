-- RPC: get_cost_per_user_metrics
-- Returns per-user/driver consumption stats for cost estimation dashboard
CREATE OR REPLACE FUNCTION public.get_cost_per_user_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_drivers_24h int;
  v_gps_writes_24h bigint;
  v_courses_24h int;
  v_edge_calls_24h bigint;
  v_db_size_mb numeric;
  v_active_drivers_now int;
  v_avg_gps_per_driver numeric;
  v_estimated_cost_per_driver numeric;
  v_result jsonb;
BEGIN
  -- Only admins can view
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  -- Active drivers in last 24h (have driver_position update)
  SELECT COUNT(DISTINCT driver_id) INTO v_active_drivers_24h
  FROM public.driver_positions
  WHERE updated_at > now() - interval '24 hours';

  -- Currently online drivers
  SELECT COUNT(*) INTO v_active_drivers_now
  FROM public.drivers
  WHERE is_available_now = true;

  -- GPS writes last 24h (proxy: count of position updates via driver_positions changes)
  -- driver_positions is upserted, so we estimate via row count + activity
  SELECT COUNT(*) INTO v_gps_writes_24h
  FROM public.driver_positions
  WHERE updated_at > now() - interval '24 hours';

  -- Courses created last 24h
  SELECT COUNT(*) INTO v_courses_24h
  FROM public.courses
  WHERE created_at > now() - interval '24 hours';

  -- Edge function calls last 24h (proxy via net._http_response if accessible)
  BEGIN
    SELECT COUNT(*) INTO v_edge_calls_24h
    FROM net._http_response
    WHERE created > now() - interval '24 hours';
  EXCEPTION WHEN OTHERS THEN
    v_edge_calls_24h := 0;
  END;

  -- DB size approximation
  SELECT pg_database_size(current_database())::numeric / (1024 * 1024) INTO v_db_size_mb;

  -- Avg GPS writes per active driver
  v_avg_gps_per_driver := CASE
    WHEN v_active_drivers_24h > 0 THEN v_gps_writes_24h::numeric / v_active_drivers_24h
    ELSE 0
  END;

  -- Estimated cost per driver per day (USD)
  -- Rough model: $0.000005 per GPS write + $0.0001 per edge call + base $0.005 fixed/driver
  v_estimated_cost_per_driver := 0.005
    + (v_avg_gps_per_driver * 0.000005)
    + (CASE WHEN v_active_drivers_24h > 0
            THEN (v_edge_calls_24h::numeric / v_active_drivers_24h) * 0.0001
            ELSE 0 END);

  v_result := jsonb_build_object(
    'generated_at', now(),
    'active_drivers_24h', v_active_drivers_24h,
    'active_drivers_now', v_active_drivers_now,
    'gps_writes_24h', v_gps_writes_24h,
    'courses_24h', v_courses_24h,
    'edge_calls_24h', v_edge_calls_24h,
    'db_size_mb', round(v_db_size_mb, 1),
    'avg_gps_per_driver', round(v_avg_gps_per_driver, 0),
    'estimated_cost_per_driver_day_usd', round(v_estimated_cost_per_driver, 4),
    'estimated_cost_per_driver_month_usd', round(v_estimated_cost_per_driver * 22, 2),
    'projected_monthly_cost_usd', round(
      (v_estimated_cost_per_driver * 22 * GREATEST(v_active_drivers_24h, 1)) + 25,
      2
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cost_per_user_metrics() TO authenticated;