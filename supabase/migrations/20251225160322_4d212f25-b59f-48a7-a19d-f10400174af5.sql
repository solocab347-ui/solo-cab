-- First drop the view that depends on the column
DROP VIEW IF EXISTS public.fleet_searchable_drivers;

-- Now change vehicle_category from text to text[] array to allow multiple categories
ALTER TABLE public.drivers 
ALTER COLUMN vehicle_category DROP DEFAULT;

ALTER TABLE public.drivers 
ALTER COLUMN vehicle_category TYPE text[] USING CASE 
  WHEN vehicle_category IS NOT NULL THEN ARRAY[vehicle_category] 
  ELSE ARRAY[]::text[] 
END;

ALTER TABLE public.drivers 
ALTER COLUMN vehicle_category SET DEFAULT ARRAY[]::text[];

-- Add comment for clarity
COMMENT ON COLUMN public.drivers.vehicle_category IS 'Array of vehicle categories: berline_luxe, berline_electrique, electrique, hybrid, van, suv, minivan, berline_standard, tpmr';

-- Recreate the view with the updated column
CREATE VIEW public.fleet_searchable_drivers WITH (security_invoker = true) AS
SELECT 
  d.id,
  d.user_id,
  d.company_name,
  d.vehicle_brand,
  d.vehicle_model,
  d.vehicle_year,
  d.vehicle_color,
  d.vehicle_equipment,
  d.vehicle_category,
  d.services_offered,
  d.working_sectors,
  d.bio,
  d.service_description,
  d.rating,
  d.total_rides,
  d.base_fare,
  d.per_km_rate,
  d.hourly_rate,
  d.home_address,
  d.vehicle_photos,
  d.gallery_photos,
  d.show_phone,
  d.show_email,
  d.sharing_number,
  p.full_name,
  p.profile_photo_url,
  p.phone,
  p.email
FROM public.drivers d
JOIN public.profiles p ON d.user_id = p.id
WHERE d.status = 'validated'
  AND d.public_profile_enabled = true
  AND d.visible_to_fleet_managers = true
  AND d.is_fleet_driver = false;