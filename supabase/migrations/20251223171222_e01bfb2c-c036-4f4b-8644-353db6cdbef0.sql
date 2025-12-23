-- Add visibility setting to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS visible_to_drivers boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accepting_proposals boolean DEFAULT true;

-- Add driver proposal fields to company_driver_agreements
ALTER TABLE public.company_driver_agreements
ADD COLUMN IF NOT EXISTS driver_presentation text,
ADD COLUMN IF NOT EXISTS driver_services_offered text[],
ADD COLUMN IF NOT EXISTS driver_vehicle_info jsonb;

-- Create index for companies visible to drivers
CREATE INDEX IF NOT EXISTS idx_companies_visible_to_drivers 
ON public.companies(visible_to_drivers) WHERE visible_to_drivers = true;

-- RLS policy for drivers to view visible companies
CREATE POLICY "Drivers can view visible companies"
ON public.companies
FOR SELECT
USING (
  visible_to_drivers = true 
  AND status = 'active'
  AND EXISTS (
    SELECT 1 FROM drivers WHERE drivers.user_id = auth.uid()
  )
);

-- RLS policy for company_driver_agreements - drivers can create proposals
CREATE POLICY "Drivers can create partnership proposals"
ON public.company_driver_agreements
FOR INSERT
WITH CHECK (
  driver_id = get_driver_id(auth.uid())
  AND proposed_by = 'driver'
);

-- RLS policy for drivers to view their agreements
CREATE POLICY "Drivers can view their company agreements"
ON public.company_driver_agreements
FOR SELECT
USING (driver_id = get_driver_id(auth.uid()));

-- RLS policy for drivers to update their agreements (signing)
CREATE POLICY "Drivers can update their company agreements"
ON public.company_driver_agreements
FOR UPDATE
USING (driver_id = get_driver_id(auth.uid()));

-- RLS policy for companies to view their agreements
CREATE POLICY "Companies can view their driver agreements"
ON public.company_driver_agreements
FOR SELECT
USING (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);

-- RLS policy for companies to update agreements (accept/reject)
CREATE POLICY "Companies can update their driver agreements"
ON public.company_driver_agreements
FOR UPDATE
USING (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);

-- RLS policy for companies to create proposals
CREATE POLICY "Companies can create partnership proposals"
ON public.company_driver_agreements
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
  AND proposed_by = 'company'
);