-- 1. Table gps_spoof_events
CREATE TABLE IF NOT EXISTS public.gps_spoof_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID,
  ride_id UUID,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('impossible_speed','teleport_jump','mock_location','stale_gps','accuracy_drift')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  observed_speed_kmh NUMERIC,
  jump_distance_m NUMERIC,
  jump_duration_s NUMERIC,
  prev_lat DOUBLE PRECISION,
  prev_lng DOUBLE PRECISION,
  curr_lat DOUBLE PRECISION,
  curr_lng DOUBLE PRECISION,
  is_mock_location BOOLEAN DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gps_spoof_driver_created ON public.gps_spoof_events(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_spoof_severity ON public.gps_spoof_events(severity, created_at DESC);

ALTER TABLE public.gps_spoof_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gps_spoof_admin_read" ON public.gps_spoof_events;
CREATE POLICY "gps_spoof_admin_read" ON public.gps_spoof_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Pas d'INSERT direct côté client : seules les RPC SECURITY DEFINER écrivent.

-- 2. RPC: record_gps_anomaly
CREATE OR REPLACE FUNCTION public.record_gps_anomaly(
  _driver_id UUID,
  _ride_id UUID,
  _anomaly_type TEXT,
  _observed_speed_kmh NUMERIC DEFAULT NULL,
  _jump_distance_m NUMERIC DEFAULT NULL,
  _jump_duration_s NUMERIC DEFAULT NULL,
  _prev_lat DOUBLE PRECISION DEFAULT NULL,
  _prev_lng DOUBLE PRECISION DEFAULT NULL,
  _curr_lat DOUBLE PRECISION DEFAULT NULL,
  _curr_lng DOUBLE PRECISION DEFAULT NULL,
  _is_mock BOOLEAN DEFAULT FALSE,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_severity TEXT;
  v_event_id UUID;
BEGIN
  v_severity := CASE
    WHEN _anomaly_type = 'mock_location' THEN 'critical'
    WHEN _anomaly_type = 'impossible_speed' AND COALESCE(_observed_speed_kmh,0) > 300 THEN 'critical'
    WHEN _anomaly_type = 'impossible_speed' THEN 'high'
    WHEN _anomaly_type = 'teleport_jump' AND COALESCE(_jump_distance_m,0) > 10000 THEN 'high'
    WHEN _anomaly_type = 'teleport_jump' THEN 'medium'
    ELSE 'low'
  END;

  INSERT INTO public.gps_spoof_events(
    driver_id, ride_id, anomaly_type, severity,
    observed_speed_kmh, jump_distance_m, jump_duration_s,
    prev_lat, prev_lng, curr_lat, curr_lng, is_mock_location, metadata
  ) VALUES (
    _driver_id, _ride_id, _anomaly_type, v_severity,
    _observed_speed_kmh, _jump_distance_m, _jump_duration_s,
    _prev_lat, _prev_lng, _curr_lat, _curr_lng, COALESCE(_is_mock, FALSE), COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_event_id;

  IF v_severity IN ('high','critical') THEN
    INSERT INTO public.security_alerts(
      alert_type, severity, title, description,
      affected_entity_type, affected_entity_id, metadata
    ) VALUES (
      'gps_spoof', v_severity,
      'Anomalie GPS détectée: ' || _anomaly_type,
      'Driver ' || COALESCE(_driver_id::text,'?') || ' — ' || _anomaly_type,
      'driver', _driver_id::text,
      jsonb_build_object('event_id', v_event_id, 'ride_id', _ride_id, 'anomaly_type', _anomaly_type)
    );
  END IF;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_gps_anomaly(UUID,UUID,TEXT,NUMERIC,NUMERIC,NUMERIC,DOUBLE PRECISION,DOUBLE PRECISION,DOUBLE PRECISION,DOUBLE PRECISION,BOOLEAN,JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_gps_anomaly(UUID,UUID,TEXT,NUMERIC,NUMERIC,NUMERIC,DOUBLE PRECISION,DOUBLE PRECISION,DOUBLE PRECISION,DOUBLE PRECISION,BOOLEAN,JSONB) TO authenticated, service_role;

-- 3. RPC: get_security_overview
CREATE OR REPLACE FUNCTION public.get_security_overview(_hours INT DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_since TIMESTAMPTZ;
  v_alerts JSONB;
  v_gps JSONB;
  v_blocked JSONB;
  v_fraud JSONB;
  v_audit JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_since := now() - (GREATEST(_hours, 1) || ' hours')::interval;

  SELECT jsonb_build_object(
    'open_total', COUNT(*) FILTER (WHERE NOT is_resolved),
    'critical', COUNT(*) FILTER (WHERE NOT is_resolved AND severity = 'critical'),
    'high', COUNT(*) FILTER (WHERE NOT is_resolved AND severity = 'high'),
    'medium', COUNT(*) FILTER (WHERE NOT is_resolved AND severity = 'medium'),
    'low', COUNT(*) FILTER (WHERE NOT is_resolved AND severity = 'low'),
    'recent', COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'type', alert_type, 'severity', severity,
      'title', title, 'created_at', created_at, 'resolved', is_resolved
    ) ORDER BY created_at DESC) FILTER (WHERE created_at >= v_since), '[]'::jsonb)
  ) INTO v_alerts FROM public.security_alerts;

  SELECT jsonb_build_object(
    'count', COUNT(*),
    'critical', COUNT(*) FILTER (WHERE severity = 'critical'),
    'high', COUNT(*) FILTER (WHERE severity = 'high'),
    'recent', COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'driver_id', driver_id, 'type', anomaly_type,
      'severity', severity, 'speed', observed_speed_kmh,
      'jump_m', jump_distance_m, 'mock', is_mock_location, 'created_at', created_at
    ) ORDER BY created_at DESC), '[]'::jsonb)
  ) INTO v_gps FROM public.gps_spoof_events WHERE created_at >= v_since;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'recent', COALESCE(jsonb_agg(jsonb_build_object(
      'ip', ip_address, 'reason', reason, 'created_at', created_at
    ) ORDER BY created_at DESC) FILTER (WHERE created_at >= v_since), '[]'::jsonb)
  ) INTO v_blocked FROM public.blocked_ips;

  SELECT jsonb_build_object(
    'count', COUNT(*),
    'recent', COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'client_id', client_id, 'flag_type', flag_type,
      'severity', severity, 'created_at', created_at
    ) ORDER BY created_at DESC), '[]'::jsonb)
  ) INTO v_fraud FROM public.client_fraud_flags WHERE created_at >= v_since;

  SELECT jsonb_build_object(
    'count', COUNT(*),
    'recent', COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'action', action, 'actor', actor_user_id,
      'target', target_user_id, 'entity_type', entity_type, 'created_at', created_at
    ) ORDER BY created_at DESC), '[]'::jsonb)
  ) INTO v_audit FROM public.security_audit_log WHERE created_at >= v_since;

  RETURN jsonb_build_object(
    'window_hours', _hours,
    'generated_at', now(),
    'alerts', v_alerts,
    'gps_anomalies', v_gps,
    'blocked_ips', v_blocked,
    'client_fraud', v_fraud,
    'audit', v_audit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_security_overview(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_security_overview(INT) TO authenticated;
