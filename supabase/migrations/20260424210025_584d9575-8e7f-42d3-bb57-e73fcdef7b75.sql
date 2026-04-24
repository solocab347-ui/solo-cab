
CREATE TABLE IF NOT EXISTS public.push_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('web','fcm','apns','db','test')),
  notification_type TEXT,
  title TEXT,
  body TEXT,
  token_preview TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  status_code INT,
  error_reason TEXT,
  request_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_logs_user_created ON public.push_delivery_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_logs_success ON public.push_delivery_logs(success, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_logs_channel ON public.push_delivery_logs(channel, created_at DESC);

ALTER TABLE public.push_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read push logs" ON public.push_delivery_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service writes push logs" ON public.push_delivery_logs
  FOR INSERT TO service_role WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.push_pending_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL DEFAULT 'generic',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  attempts INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  delivered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_queue_user_pending ON public.push_pending_queue(user_id) WHERE delivered_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_push_queue_expires ON public.push_pending_queue(expires_at) WHERE delivered_at IS NULL;

ALTER TABLE public.push_pending_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own queue" ON public.push_pending_queue
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all queue" ON public.push_pending_queue
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service manages queue" ON public.push_pending_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW public.admin_push_tokens_view
WITH (security_invoker = true) AS
SELECT
  pt.id,
  pt.user_id,
  p.email,
  p.full_name,
  pt.platform,
  pt.device_model,
  pt.app_version,
  pt.is_active,
  pt.last_used_at,
  pt.created_at,
  LEFT(pt.token, 24) || '…' AS token_preview,
  EXTRACT(EPOCH FROM (now() - pt.last_used_at))::int AS seconds_since_used
FROM public.push_tokens pt
LEFT JOIN public.profiles p ON p.id = pt.user_id;

COMMENT ON VIEW public.admin_push_tokens_view IS 'Vue admin : liste des tokens push avec métadonnées d''ancienneté';
