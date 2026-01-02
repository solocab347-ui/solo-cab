-- Add pending modification columns to driver_partnerships
ALTER TABLE public.driver_partnerships
ADD COLUMN IF NOT EXISTS pending_modification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pending_new_commission NUMERIC,
ADD COLUMN IF NOT EXISTS pending_new_payment_schedule TEXT,
ADD COLUMN IF NOT EXISTS pending_modification_by UUID,
ADD COLUMN IF NOT EXISTS pending_modification_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pending_modification_message TEXT;

-- Add comments
COMMENT ON COLUMN public.driver_partnerships.pending_modification IS 'Whether there is a pending modification request';
COMMENT ON COLUMN public.driver_partnerships.pending_new_commission IS 'Proposed new commission percentage';
COMMENT ON COLUMN public.driver_partnerships.pending_new_payment_schedule IS 'Proposed new payment schedule';
COMMENT ON COLUMN public.driver_partnerships.pending_modification_by IS 'Driver ID who proposed the modification';
COMMENT ON COLUMN public.driver_partnerships.pending_modification_at IS 'When the modification was proposed';