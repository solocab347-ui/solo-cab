-- Add vehicle_category column to drivers table
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS vehicle_category text DEFAULT 'berline_standard';

-- Add comment for clarity
COMMENT ON COLUMN public.drivers.vehicle_category IS 'Category of vehicle: berline_luxe, berline_electrique, electrique, hybrid, van, berline_standard';

-- Drop and recreate the view with the new column
DROP VIEW IF EXISTS public.fleet_searchable_drivers;

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