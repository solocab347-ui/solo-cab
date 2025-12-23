-- Add payment tracking fields to company_payments table
ALTER TABLE public.company_payments 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sent_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS received_confirmed_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS dispute_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dispute_created_at TIMESTAMP WITH TIME ZONE;

-- Update status enum to include new states
COMMENT ON COLUMN public.company_payments.status IS 'Payment status: pending, sent, received, disputed';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_payments_status ON public.company_payments(status);
CREATE INDEX IF NOT EXISTS idx_company_payments_company_driver ON public.company_payments(company_id, driver_id);