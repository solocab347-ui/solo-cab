-- Recréer la vue drivers_available_for_sharing avec email et show_email
DROP VIEW IF EXISTS public.drivers_available_for_sharing;

CREATE OR REPLACE VIEW public.drivers_available_for_sharing AS
SELECT 
  d.id,
  d.user_id,
  d.sharing_number,
  d.working_sectors,
  d.rating,
  d.total_rides,
  d.company_name,
  d.vehicle_brand,
  d.vehicle_model,
  d.show_phone_for_sharing,
  d.show_email,
  d.display_driver_name,
  d.display_company_name,
  p.full_name,
  p.profile_photo_url,
  CASE WHEN d.show_phone_for_sharing = true THEN p.phone ELSE NULL END AS phone,
  CASE WHEN d.show_email = true THEN p.email ELSE NULL END AS email
FROM drivers d
JOIN profiles p ON d.user_id = p.id
WHERE d.visible_to_drivers = true 
  AND d.is_fleet_driver IS NOT TRUE 
  AND d.fleet_manager_id IS NULL 
  AND d.status = 'validated';

-- Recréer la fonction search_available_partners avec email
DROP FUNCTION IF EXISTS public.search_available_partners(uuid, text, text, numeric);

CREATE OR REPLACE FUNCTION public.search_available_partners(
  _driver_id uuid,
  _department text DEFAULT NULL,
  _city text DEFAULT NULL,
  _min_rating numeric DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  sharing_number integer,
  formatted_sharing_number text,
  working_sectors text[],
  rating numeric,
  total_rides integer,
  company_name text,
  vehicle_brand text,
  vehicle_model text,
  full_name text,
  profile_photo_url text,
  phone text,
  email text,
  display_driver_name boolean,
  display_company_name boolean,
  show_phone boolean,
  show_email boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.user_id,
    v.sharing_number,
    'SOLO-' || LPAD(v.sharing_number::text, 6, '0') as formatted_sharing_number,
    v.working_sectors,
    v.rating,
    v.total_rides,
    v.company_name,
    v.vehicle_brand,
    v.vehicle_model,
    v.full_name,
    v.profile_photo_url,
    v.phone,
    v.email,
    v.display_driver_name,
    v.display_company_name,
    v.show_phone_for_sharing AS show_phone,
    v.show_email
  FROM drivers_available_for_sharing v
  WHERE v.id != _driver_id
    AND (_min_rating IS NULL OR v.rating >= _min_rating)
    AND (
      _department IS NULL 
      OR EXISTS (
        SELECT 1 FROM unnest(v.working_sectors) AS sector 
        WHERE sector ILIKE '%' || _department || '%'
      )
    )
    AND (
      _city IS NULL 
      OR EXISTS (
        SELECT 1 FROM unnest(v.working_sectors) AS sector 
        WHERE sector ILIKE '%' || _city || '%'
      )
    )
  ORDER BY v.rating DESC NULLS LAST, v.total_rides DESC NULLS LAST;
END;
$$;