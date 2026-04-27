-- Idempotency log for Stripe webhook events
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  livemode BOOLEAN,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'received', -- received | processed | error | duplicate
  error_message TEXT,
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON public.stripe_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_received_at ON public.stripe_webhook_events(received_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read this audit log
CREATE POLICY "Admins read webhook events"
ON public.stripe_webhook_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::text));

-- No client write — only the service role (used by edge functions) can write