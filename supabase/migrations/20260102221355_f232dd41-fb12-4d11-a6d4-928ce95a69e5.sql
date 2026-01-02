-- Update default values to false for privacy by default
ALTER TABLE public.drivers 
ALTER COLUMN show_rating_for_sharing SET DEFAULT false,
ALTER COLUMN show_rides_for_sharing SET DEFAULT false;

-- Update existing drivers to have false (privacy by default) if they haven't explicitly set it
UPDATE public.drivers 
SET show_rating_for_sharing = false, show_rides_for_sharing = false
WHERE show_rating_for_sharing = true AND show_rides_for_sharing = true;