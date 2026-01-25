-- Add payment-related columns to courses table for bank imprint and capture
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_captured_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bank_imprint_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS solocab_fee_amount NUMERIC(10,2) DEFAULT 0;

-- Add stripe session id to devis
ALTER TABLE public.devis
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Create index for payment lookups
CREATE INDEX IF NOT EXISTS idx_courses_payment_status ON public.courses(payment_status);
CREATE INDEX IF NOT EXISTS idx_courses_stripe_session ON public.courses(stripe_checkout_session_id);

-- Add comment for documentation
COMMENT ON COLUMN public.courses.payment_status IS 'Payment status: pending, bank_imprint_pending, payment_pending, paid, failed, refunded';
COMMENT ON COLUMN public.courses.solocab_fee_amount IS 'SoloCab platform fee in EUR (0.50€ for Stripe Connect payments)';