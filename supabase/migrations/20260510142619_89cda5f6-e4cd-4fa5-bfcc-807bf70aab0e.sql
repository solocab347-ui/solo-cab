
-- =====================================================
-- 1. Ajouter colonne `phase` (optionnel) via details JSONB déjà présent.
-- On n'ajoute pas de colonne, on utilise details->>'phase'.
-- Index pour requêtes admin sur courses
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_realtime_health_log_phase
  ON public.realtime_health_log ((details->>'phase'), created_at DESC)
  WHERE event_type = 'course_latency';

CREATE INDEX IF NOT EXISTS idx_realtime_health_log_ride
  ON public.realtime_health_log ((details->>'ride_id'))
  WHERE details ? 'ride_id';

-- =====================================================
-- 2. RPC : percentiles de latence par phase (24h par défaut)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_course_latency_percentiles(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  phase TEXT,
  sample_count BIGINT,
  p50_ms NUMERIC,
  p95_ms NUMERIC,
  p99_ms NUMERIC,
  max_ms INTEGER,
  avg_ms NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    COALESCE(details->>'phase', 'unknown') AS phase,
    COUNT(*)::BIGINT AS sample_count,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC AS p50_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC AS p95_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)::NUMERIC AS p99_ms,
    MAX(latency_ms)::INTEGER AS max_ms,
    AVG(latency_ms)::NUMERIC AS avg_ms
  FROM public.realtime_health_log
  WHERE event_type = 'course_latency'
    AND latency_ms IS NOT NULL
    AND created_at > NOW() - (p_hours || ' hours')::INTERVAL
  GROUP BY COALESCE(details->>'phase', 'unknown')
  ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.get_course_latency_percentiles(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_course_latency_percentiles(INTEGER) TO authenticated;

-- =====================================================
-- 3. RPC : résumé global observabilité 24h (admin only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_observability_summary(
  p_hours INTEGER DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_since TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  v_since := NOW() - (p_hours || ' hours')::INTERVAL;

  SELECT jsonb_build_object(
    'window_hours', p_hours,
    'generated_at', NOW(),
    'realtime', (
      SELECT jsonb_build_object(
        'reconnects', COUNT(*) FILTER (WHERE event_type = 'realtime_reconnect'),
        'zombie_sockets', COUNT(*) FILTER (WHERE event_type = 'realtime_zombie_detected'),
        'channel_errors', COUNT(*) FILTER (WHERE event_type = 'realtime_channel_error'),
        'heartbeat_failed', COUNT(*) FILTER (WHERE event_type = 'heartbeat_failed'),
        'missed_updates', COUNT(*) FILTER (WHERE event_type = 'missed_update_detected'),
        'app_resumes', COUNT(*) FILTER (WHERE event_type = 'app_state_resume')
      )
      FROM public.realtime_health_log
      WHERE created_at > v_since
    ),
    'gps', (
      SELECT jsonb_build_object(
        'total_loss_events', COUNT(*),
        'forced_offline', COUNT(*) FILTER (WHERE loss_type = 'stale_forced_offline'),
        'watchdog_triggered', COUNT(*) FILTER (WHERE loss_type = 'watchdog_triggered'),
        'background_paused', COUNT(*) FILTER (WHERE loss_type = 'background_pause'),
        'foreground_service_lost', COUNT(*) FILTER (WHERE loss_type = 'foreground_service_lost'),
        'no_fix_timeout', COUNT(*) FILTER (WHERE loss_type = 'no_fix_timeout'),
        'low_accuracy', COUNT(*) FILTER (WHERE loss_type = 'low_accuracy'),
        'distinct_drivers', COUNT(DISTINCT driver_id)
      )
      FROM public.gps_loss_log
      WHERE created_at > v_since
    ),
    'courses_latency', (
      SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb)
      FROM public.get_course_latency_percentiles(p_hours) p
    ),
    'critical_errors', (
      SELECT COUNT(*) FROM public.realtime_health_log
      WHERE created_at > v_since
        AND event_type IN ('realtime_zombie_detected', 'heartbeat_failed', 'realtime_channel_error')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_observability_summary(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_observability_summary(INTEGER) TO authenticated;

-- =====================================================
-- 4. RPC : hourly buckets (pour mini-charts admin)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_observability_hourly(
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  bucket TIMESTAMPTZ,
  reconnects BIGINT,
  zombies BIGINT,
  gps_losses BIGINT,
  forced_offline BIGINT,
  course_received BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH hours AS (
    SELECT generate_series(
      date_trunc('hour', NOW() - (p_hours || ' hours')::INTERVAL),
      date_trunc('hour', NOW()),
      '1 hour'::INTERVAL
    ) AS bucket
  )
  SELECT
    h.bucket,
    COALESCE(SUM((rh.event_type = 'realtime_reconnect')::INT), 0)::BIGINT,
    COALESCE(SUM((rh.event_type = 'realtime_zombie_detected')::INT), 0)::BIGINT,
    COALESCE((SELECT COUNT(*) FROM public.gps_loss_log g
              WHERE date_trunc('hour', g.created_at) = h.bucket), 0)::BIGINT,
    COALESCE((SELECT COUNT(*) FROM public.gps_loss_log g
              WHERE date_trunc('hour', g.created_at) = h.bucket
                AND g.loss_type = 'stale_forced_offline'), 0)::BIGINT,
    COALESCE(SUM((rh.event_type = 'course_received')::INT), 0)::BIGINT
  FROM hours h
  LEFT JOIN public.realtime_health_log rh
    ON date_trunc('hour', rh.created_at) = h.bucket
  GROUP BY h.bucket
  ORDER BY h.bucket;
$$;

REVOKE ALL ON FUNCTION public.get_observability_hourly(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_observability_hourly(INTEGER) TO authenticated;
