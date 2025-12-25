-- Add services_offered column to fleet_managers for custom services
ALTER TABLE public.fleet_managers
ADD COLUMN IF NOT EXISTS services_offered text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.fleet_managers.services_offered IS 'Custom services offered by the fleet manager';

-- Also check the view definition for fleet_searchable_drivers
-- We need to understand why it returns no results