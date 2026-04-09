
-- Set defaults to true (ratings always visible)
ALTER TABLE public.drivers ALTER COLUMN show_rating_public SET DEFAULT true;
ALTER TABLE public.drivers ALTER COLUMN show_rating_for_sharing SET DEFAULT true;
ALTER TABLE public.drivers ALTER COLUMN show_rating_partners SET DEFAULT true;

-- Update all existing drivers to show ratings
UPDATE public.drivers SET 
  show_rating_public = true,
  show_rating_for_sharing = true,
  show_rating_partners = true
WHERE show_rating_public = false OR show_rating_for_sharing = false OR show_rating_partners = false;
