-- 1. Remove duplicated index (idx_courses_driver_status is redundant with composite indexes)
DROP INDEX IF EXISTS public.idx_courses_driver_status;

-- 2. Integrity trigger: ensure driver_id is always present in driver_ids array (clients table)
CREATE OR REPLACE FUNCTION public.ensure_driver_id_in_driver_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If driver_id is set but not in driver_ids, add it
  IF NEW.driver_id IS NOT NULL THEN
    IF NEW.driver_ids IS NULL THEN
      NEW.driver_ids := ARRAY[NEW.driver_id];
    ELSIF NOT (NEW.driver_id = ANY(NEW.driver_ids)) THEN
      NEW.driver_ids := array_append(NEW.driver_ids, NEW.driver_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_driver_consistency_trigger ON public.clients;
CREATE TRIGGER ensure_driver_consistency_trigger
BEFORE INSERT OR UPDATE OF driver_id, driver_ids ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.ensure_driver_id_in_driver_ids();

-- 3. Monitoring table: dispatch_metrics
CREATE TABLE IF NOT EXISTS public.dispatch_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID,
  ride_request_id UUID,
  driver_id UUID,
  event_type TEXT NOT NULL, -- 'dispatch_sent', 'accepted', 'timeout', 'rejected', 'cancelled'
  channel TEXT, -- 'queue', 'shared', 'ride_request', 'direct'
  response_time_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_metrics_event_type ON public.dispatch_metrics(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_metrics_driver ON public.dispatch_metrics(driver_id, created_at DESC) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dispatch_metrics_course ON public.dispatch_metrics(course_id) WHERE course_id IS NOT NULL;

ALTER TABLE public.dispatch_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can view metrics
CREATE POLICY "Admins can view dispatch metrics"
ON public.dispatch_metrics
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- System (service role) and authenticated users can insert metrics
CREATE POLICY "Authenticated users can log dispatch metrics"
ON public.dispatch_metrics
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Partial index for ride_requests pending lookups (accelerate driver-side filtering)
CREATE INDEX IF NOT EXISTS idx_ride_requests_selected_driver_pending
ON public.ride_requests (selected_driver_id, created_at DESC)
WHERE status = 'pending' AND selected_driver_id IS NOT NULL;

-- 5. Cleanup orphan client (driver_id NULL AND driver_ids NULL/empty AND not exclusive setup)
-- Mark as inconsistent for manual review rather than delete
UPDATE public.clients
SET driver_ids = ARRAY[]::uuid[]
WHERE driver_id IS NULL 
  AND driver_ids IS NULL
  AND is_exclusive = false;

-- 6. Helper view for monitoring dispatch health (admin only via RLS on underlying table)
CREATE OR REPLACE VIEW public.dispatch_health_summary
WITH (security_invoker = true)
AS
SELECT 
  date_trunc('hour', created_at) AS hour,
  event_type,
  channel,
  COUNT(*) AS event_count,
  AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) AS avg_response_ms,
  MAX(response_time_ms) AS max_response_ms
FROM public.dispatch_metrics
WHERE created_at > now() - interval '24 hours'
GROUP BY date_trunc('hour', created_at), event_type, channel
ORDER BY hour DESC;