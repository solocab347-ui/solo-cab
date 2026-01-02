-- Add visibility columns for sharing to drivers table
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS show_rating_for_sharing BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_rides_for_sharing BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.drivers.show_rating_for_sharing IS 'Whether to show rating to partners in sharing context';
COMMENT ON COLUMN public.drivers.show_rides_for_sharing IS 'Whether to show total rides to partners in sharing context';