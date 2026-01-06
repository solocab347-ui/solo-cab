-- Add client payment confirmation fields to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS client_payment_confirmation TEXT CHECK (client_payment_confirmation IN ('paid_on_spot', 'company_will_pay', NULL)),
ADD COLUMN IF NOT EXISTS client_payment_confirmation_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS client_payment_confirmation_token TEXT;

-- Add client confirmation to company_courses for better tracking
ALTER TABLE public.company_courses
ADD COLUMN IF NOT EXISTS client_confirmed_payment_method TEXT CHECK (client_confirmed_payment_method IN ('paid_on_spot', 'company_will_pay', NULL)),
ADD COLUMN IF NOT EXISTS client_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.courses.client_payment_confirmation IS 'Client confirmation of payment method: paid_on_spot or company_will_pay';
COMMENT ON COLUMN public.courses.client_payment_confirmation_at IS 'Timestamp when client confirmed payment method';
COMMENT ON COLUMN public.company_courses.client_confirmed_payment_method IS 'Client confirmation matching driver declaration for double verification';