
-- ============================================
-- 1. TABLE realtime_health_log
-- ============================================
CREATE TABLE IF NOT EXISTS public.realtime_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID,
  user_id UUID,
  event_type TEXT NOT NULL,
  channel_name TEXT,
  latency_ms INTEGER,
  details JSONB DEFAULT '{}'::jsonb,
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_realtime_health_log_created_at
  ON public.realtime_health_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_health_log_driver_event
  ON public.realtime_health_log (driver_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_realtime_health_log_event_type
  ON public.realtime_health_log (event_type, created_at DESC);

ALTER TABLE public.realtime_health_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert own realtime logs"
  ON public.realtime_health_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers see their own realtime logs"
  ON public.realtime_health_log
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins manage realtime logs"
  ON public.realtime_health_log
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 2. TABLE gps_loss_log
-- ============================================
CREATE TABLE IF NOT EXISTS public.gps_loss_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  loss_type TEXT NOT NULL,
  gap_ms INTEGER,
  last_known_lat NUMERIC,
  last_known_lng NUMERIC,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gps_loss_log_driver_created
  ON public.gps_loss_log (driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_loss_log_created
  ON public.gps_loss_log (created_at DESC);

ALTER TABLE public.gps_loss_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers insert own gps loss logs"
  ON public.gps_loss_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers see own gps loss logs"
  ON public.gps_loss_log
  FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()) OR
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins manage gps loss logs"
  ON public.gps_loss_log
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 3. Bump statement_timeout sur run_platform_health_check (25s -> 90s)
-- ============================================
ALTER FUNCTION public.run_platform_health_check(text) SET statement_timeout = '90s';

-- ============================================
-- 4. RPC detect_and_fix_stale_gps_drivers
-- ============================================
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
  v_fixed_count INT := 0;
  v_driver RECORD;
BEGIN
  v_threshold := NOW() - (p_max_age_seconds || ' seconds')::INTERVAL;

  -- On ne touche PAS aux chauffeurs en course (assigned / in_ride).
  -- Seulement ceux qui sont 'online' avec un GPS périmé.
  FOR v_driver IN
    SELECT id, user_id, last_location_update, current_latitude, current_longitude
    FROM public.drivers
    WHERE is_available_now = true
      AND driver_status = 'online'
      AND (last_location_update IS NULL OR last_location_update < v_threshold)
    LIMIT 200
  LOOP
    UPDATE public.drivers
       SET is_available_now = false,
           driver_status = 'offline',
           updated_at = NOW()
     WHERE id = v_driver.id
       AND driver_status = 'online'; -- safety re-check

    v_fixed_count := v_fixed_count + 1;
    v_stale_drivers := v_stale_drivers || jsonb_build_object(
      'driver_id', v_driver.id,
      'last_location_update', v_driver.last_location_update,
      'gap_seconds', EXTRACT(EPOCH FROM (NOW() - COALESCE(v_driver.last_location_update, NOW() - INTERVAL '1 day')))::INT
    );

    -- Trace dans gps_loss_log
    INSERT INTO public.gps_loss_log (driver_id, loss_type, gap_ms, last_known_lat, last_known_lng, details)
    VALUES (
      v_driver.id,
      'stale_forced_offline',
      EXTRACT(EPOCH FROM (NOW() - COALESCE(v_driver.last_location_update, NOW() - INTERVAL '1 day')))::INT * 1000,
      v_driver.current_latitude,
      v_driver.current_longitude,
      jsonb_build_object('threshold_seconds', p_max_age_seconds, 'source', 'cron_detector')
    );
  END LOOP;

  RETURN jsonb_build_object(
    'fixed_count', v_fixed_count,
    'threshold_seconds', p_max_age_seconds,
    'drivers', v_stale_drivers,
    'checked_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.detect_and_fix_stale_gps_drivers(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_and_fix_stale_gps_drivers(INTEGER) TO service_role;
