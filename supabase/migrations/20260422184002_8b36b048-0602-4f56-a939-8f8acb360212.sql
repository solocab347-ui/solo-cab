
-- Table des tokens push natifs (FCM Android / APNS iOS) et web (VAPID)
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  device_id TEXT,
  device_model TEXT,
  app_version TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_active ON public.push_tokens(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON public.push_tokens(platform) WHERE is_active = true;

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- L'utilisateur gère ses propres tokens
CREATE POLICY "Users manage own push tokens - select"
  ON public.push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own push tokens - insert"
  ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own push tokens - update"
  ON public.push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own push tokens - delete"
  ON public.push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table de log permissions (audit)
CREATE TABLE IF NOT EXISTS public.user_permissions_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('granted', 'denied', 'prompted', 'unknown')),
  platform TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perms_log_user ON public.user_permissions_log(user_id, created_at DESC);

ALTER TABLE public.user_permissions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own perm logs"
  ON public.user_permissions_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own perm logs"
  ON public.user_permissions_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
