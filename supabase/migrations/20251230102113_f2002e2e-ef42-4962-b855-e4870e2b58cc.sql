-- Add new visibility columns for drivers
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS visible_to_companies boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_rating_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_rating_partners boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_pricing_partners boolean DEFAULT false;

-- Update comments for clarity
COMMENT ON COLUMN public.drivers.visible_to_fleet_managers IS 'Driver is visible in fleet manager search (independent toggle)';
COMMENT ON COLUMN public.drivers.visible_to_companies IS 'Driver is visible in company search (independent toggle)';
COMMENT ON COLUMN public.drivers.show_rating_public IS 'Show rating on public profile (default: false)';
COMMENT ON COLUMN public.drivers.show_rating_partners IS 'Show rating to partners (drivers, fleet managers, companies) (default: false)';
COMMENT ON COLUMN public.drivers.show_pricing_partners IS 'Show pricing info to partners (fleet managers, companies) (default: false)';