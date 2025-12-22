-- Add driver relationship type and commission to invitations
ALTER TABLE public.fleet_driver_invitations
ADD COLUMN IF NOT EXISTS driver_type text NOT NULL DEFAULT 'salaried',
ADD COLUMN IF NOT EXISTS commission_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS commission_accepted_at timestamp with time zone;

-- Add documents tracking for fleet drivers
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS fleet_documents_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS fleet_documents_submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS fleet_documents_deadline timestamp with time zone;

-- Add comment for clarity
COMMENT ON COLUMN public.fleet_driver_invitations.driver_type IS 'salaried = uses manager payment equipment (no commission), independent = own equipment (commission applies)';
COMMENT ON COLUMN public.fleet_driver_invitations.commission_percentage IS 'Commission percentage for independent drivers';
COMMENT ON COLUMN public.drivers.fleet_documents_status IS 'pending, submitted, validated, rejected';