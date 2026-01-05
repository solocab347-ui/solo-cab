-- Add pending modification columns to company_driver_agreements
ALTER TABLE public.company_driver_agreements
ADD COLUMN IF NOT EXISTS pending_modification boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pending_new_payment_frequency text,
ADD COLUMN IF NOT EXISTS pending_new_payment_methods text[],
ADD COLUMN IF NOT EXISTS pending_new_payment_day integer,
ADD COLUMN IF NOT EXISTS pending_modification_by text,
ADD COLUMN IF NOT EXISTS pending_modification_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS pending_modification_message text,
ADD COLUMN IF NOT EXISTS contract_generated_at timestamp with time zone;

-- Add index for faster queries on pending modifications
CREATE INDEX IF NOT EXISTS idx_company_driver_agreements_pending_modification 
ON public.company_driver_agreements(pending_modification) 
WHERE pending_modification = true;