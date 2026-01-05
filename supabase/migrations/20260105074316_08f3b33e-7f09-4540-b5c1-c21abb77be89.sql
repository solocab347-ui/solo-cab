-- Add mutual blocking fields for company-driver agreements
ALTER TABLE public.company_driver_agreements 
ADD COLUMN IF NOT EXISTS driver_blocked_company boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS driver_blocked_company_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS company_blocked_driver boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS company_blocked_driver_at timestamp with time zone;

-- Add index for faster lookups when filtering blocked entities
CREATE INDEX IF NOT EXISTS idx_company_driver_agreements_blocks 
ON public.company_driver_agreements (driver_id, company_id, driver_blocked_company, company_blocked_driver);

-- Add comment for documentation
COMMENT ON COLUMN public.company_driver_agreements.driver_blocked_company IS 'When true, driver no longer sees company in searches and company no longer sees driver';
COMMENT ON COLUMN public.company_driver_agreements.company_blocked_driver IS 'When true, company no longer sees driver in searches and driver no longer sees company';