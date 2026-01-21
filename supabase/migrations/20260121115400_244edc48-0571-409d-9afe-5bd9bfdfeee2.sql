-- Add columns to track pending subscription choices for incomplete registrations
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS pending_subscription_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pending_wants_plate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_failed_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT DEFAULT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_drivers_subscription_paid ON public.drivers(subscription_paid) WHERE subscription_paid = false;
CREATE INDEX IF NOT EXISTS idx_drivers_registration_step ON public.drivers(registration_step) WHERE registration_step IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.drivers.pending_subscription_type IS 'Stores chosen subscription type (monthly/annual) before payment completion';
COMMENT ON COLUMN public.drivers.pending_wants_plate IS 'Stores if driver wants NFC plate before payment completion';
COMMENT ON COLUMN public.drivers.payment_failed_at IS 'Timestamp of last failed payment attempt';
COMMENT ON COLUMN public.drivers.payment_failed_reason IS 'Reason for payment failure';
COMMENT ON COLUMN public.drivers.stripe_checkout_session_id IS 'Last Stripe checkout session ID for resuming payment';