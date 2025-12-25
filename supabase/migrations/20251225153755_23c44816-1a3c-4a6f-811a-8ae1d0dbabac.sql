-- Add column for drivers to be visible to fleet managers
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS visible_to_fleet_managers boolean DEFAULT false;

-- Add index for searching
CREATE INDEX IF NOT EXISTS idx_drivers_visible_to_fleet ON public.drivers(visible_to_fleet_managers) WHERE visible_to_fleet_managers = true;

-- Create a view for fleet managers to search available drivers
CREATE OR REPLACE VIEW public.fleet_searchable_drivers AS
SELECT 
  d.id,
  d.user_id,
  d.company_name,
  d.vehicle_brand,
  d.vehicle_model,
  d.vehicle_year,
  d.vehicle_color,
  d.vehicle_equipment,
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
  d.home_latitude,
  d.home_longitude,
  d.vehicle_photos,
  d.gallery_photos,
  d.show_phone,
  d.show_email,
  d.sharing_number,
  p.full_name,
  p.profile_photo_url,
  p.phone,
  p.email
FROM drivers d
JOIN profiles p ON d.user_id = p.id
WHERE d.visible_to_fleet_managers = true
  AND d.status = 'validated'
  AND d.fleet_manager_id IS NULL
  AND d.is_fleet_driver IS NOT TRUE;

-- RLS policy for fleet managers to view searchable drivers
CREATE POLICY "Fleet managers can view searchable drivers"
ON public.drivers
FOR SELECT
USING (
  visible_to_fleet_managers = true 
  AND status = 'validated'
  AND fleet_manager_id IS NULL
  AND EXISTS (
    SELECT 1 FROM fleet_managers fm 
    WHERE fm.user_id = auth.uid()
  )
);