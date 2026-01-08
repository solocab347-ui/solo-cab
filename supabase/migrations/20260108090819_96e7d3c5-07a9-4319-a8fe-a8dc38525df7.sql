
-- Create a SECURITY DEFINER function to get public driver profile
-- This bypasses RLS to allow viewing pioneer drivers with pending status
CREATE OR REPLACE FUNCTION public.get_public_driver_profile_by_id(driver_id_param UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  company_name TEXT,
  vehicle_model TEXT,
  vehicle_brand TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  service_description TEXT,
  base_rate NUMERIC,
  per_km_rate NUMERIC,
  working_sectors TEXT[],
  vehicle_equipment TEXT[],
  services_offered TEXT[],
  vehicle_photos TEXT[],
  gallery_photos TEXT[],
  show_phone BOOLEAN,
  show_email BOOLEAN,
  show_rating_public BOOLEAN,
  display_driver_name BOOLEAN,
  display_company_name BOOLEAN,
  is_pioneer BOOLEAN,
  status TEXT,
  free_access_type TEXT,
  free_access_end_date TIMESTAMPTZ,
  contact_phone TEXT,
  contact_email TEXT,
  profile_full_name TEXT,
  profile_email TEXT,
  profile_phone TEXT,
  profile_photo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.user_id,
    d.company_name,
    d.vehicle_model,
    d.vehicle_brand,
    d.vehicle_year,
    d.vehicle_color,
    d.service_description,
    d.base_rate,
    d.per_km_rate,
    d.working_sectors,
    d.vehicle_equipment,
    d.services_offered,
    d.vehicle_photos,
    d.gallery_photos,
    d.show_phone,
    d.show_email,
    d.show_rating_public,
    d.display_driver_name,
    d.display_company_name,
    d.is_pioneer,
    d.status::TEXT,
    d.free_access_type,
    d.free_access_end_date,
    d.contact_phone,
    d.contact_email,
    p.full_name AS profile_full_name,
    p.email AS profile_email,
    p.phone AS profile_phone,
    p.profile_photo_url AS profile_photo_url
  FROM drivers d
  LEFT JOIN profiles p ON p.id = d.user_id
  WHERE d.id = driver_id_param
    AND d.public_profile_enabled = true
    AND (
      -- Either validated driver
      d.status = 'validated'
      -- Or pioneer with active trial (pending or validated)
      OR (
        d.is_pioneer = true 
        AND d.free_access_type = 'trial' 
        AND d.free_access_end_date > NOW()
      )
    );
END;
$$;

-- Grant execute permission to all users (including anonymous)
GRANT EXECUTE ON FUNCTION public.get_public_driver_profile_by_id(UUID) TO anon, authenticated;
