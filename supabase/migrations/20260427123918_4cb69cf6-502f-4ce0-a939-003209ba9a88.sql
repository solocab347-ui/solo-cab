ALTER TABLE public.shared_courses
  ADD COLUMN IF NOT EXISTS client_payment_url text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS payment_link_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_link_created_by uuid;

CREATE INDEX IF NOT EXISTS idx_shared_courses_stripe_session
  ON public.shared_courses (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;