-- Add new columns to fleet_managers for public profile settings
ALTER TABLE public.fleet_managers
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS show_contact_name BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_address BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_validate_courses BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS favorite_driver_priority BOOLEAN DEFAULT true;

-- Add fleet_manager_id to clients table for fleet client association
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS fleet_manager_id UUID REFERENCES public.fleet_managers(id),
ADD COLUMN IF NOT EXISTS favorite_driver_id UUID REFERENCES public.drivers(id);

-- Create index for fleet clients lookup
CREATE INDEX IF NOT EXISTS idx_clients_fleet_manager_id ON public.clients(fleet_manager_id);

-- Update RLS policy for fleet clients to see their fleet's drivers
CREATE POLICY "Fleet clients can view their fleet's drivers"
ON public.drivers
FOR SELECT
USING (
  fleet_manager_id IN (
    SELECT fleet_manager_id FROM public.clients WHERE user_id = auth.uid() AND fleet_manager_id IS NOT NULL
  )
);

-- Update RLS policy for fleet clients to create courses
CREATE POLICY "Fleet clients can create courses with fleet drivers"
ON public.courses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.user_id = auth.uid()
    AND c.fleet_manager_id IS NOT NULL
    AND (
      driver_id IN (
        SELECT d.id FROM public.drivers d WHERE d.fleet_manager_id = c.fleet_manager_id
      )
    )
  )
);