CREATE OR REPLACE FUNCTION public.detect_and_fix_stale_gps_drivers(
  p_max_age_seconds INTEGER DEFAULT 120
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '15s'
AS $$
DECLARE
  v_threshold TIMESTAMPTZ;
  v_stale_drivers JSONB := '[]'::jsonb;
  v_logged_count INT := 0;
  v_driver RECORD;
BEGIN
  v_threshold := NOW() - (p_max_age_seconds || ' seconds')::INTERVAL;

  -- IMPORTANT: ne jamais passer un chauffeur offline automatiquement.
  -- Le bouton ON/OFF est la seule autorité de déconnexion manuelle.
  -- Cette tâche ne fait que tracer un GPS silencieux pour observabilité.
  FOR v_driver IN
    SELECT id, user_id, last_location_update, current_latitude, current_longitude
    FROM public.drivers
    WHERE driver_status = 'online'
      AND (last_location_update IS NULL OR last_location_update < v_threshold)
    LIMIT 200
  LOOP
    v_logged_count := v_logged_count + 1;
    v_stale_drivers := v_stale_drivers || jsonb_build_object(
      'driver_id', v_driver.id,
      'last_location_update', v_driver.last_location_update,
      'gap_seconds', EXTRACT(EPOCH FROM (NOW() - COALESCE(v_driver.last_location_update, NOW() - INTERVAL '1 day')))::INT
    );

    INSERT INTO public.gps_loss_log (driver_id, loss_type, gap_ms, last_known_lat, last_known_lng, details)
    VALUES (
      v_driver.id,
      'no_fix_timeout',
      EXTRACT(EPOCH FROM (NOW() - COALESCE(v_driver.last_location_update, NOW() - INTERVAL '1 day')))::INT * 1000,
      v_driver.current_latitude,
      v_driver.current_longitude,
      jsonb_build_object(
        'threshold_seconds', p_max_age_seconds,
        'source', 'cron_detector',
        'action', 'logged_only_no_auto_offline'
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'fixed_count', 0,
    'logged_count', v_logged_count,
    'threshold_seconds', p_max_age_seconds,
    'drivers', v_stale_drivers,
    'checked_at', NOW(),
    'policy', 'manual_on_off_only'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.detect_and_fix_stale_gps_drivers(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_and_fix_stale_gps_drivers(INTEGER) TO service_role;