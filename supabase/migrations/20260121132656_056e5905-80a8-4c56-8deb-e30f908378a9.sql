
-- Supprimer et recréer la fonction avec tous les champs nécessaires
DROP FUNCTION IF EXISTS public.get_public_driver_profile_by_id(uuid);

CREATE OR REPLACE FUNCTION public.get_public_driver_profile_by_id(driver_id_param uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  company_name text,
  vehicle_model text,
  vehicle_brand text,
  vehicle_color text,
  vehicle_year integer,
  bio text,
  service_description text,
  services_offered text[],
  vehicle_equipment text[],
  working_sectors text[],
  vehicle_photos text[],
  gallery_photos text[],
  rating numeric,
  total_rides integer,
  max_passengers integer,
  display_driver_name boolean,
  display_company_name boolean,
  show_phone boolean,
  show_email boolean,
  card_photo_url text,
  is_pioneer boolean,
  vehicle_category text[],
  status driver_status,
  created_at timestamptz,
  base_rate numeric,
  per_km_rate numeric,
  contact_phone text,
  contact_email text,
  show_rating_public boolean,
  profile_full_name text,
  profile_photo_url text,
  profile_phone text,
  profile_email text
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
    d.vehicle_color,
    d.vehicle_year,
    d.bio,
    d.service_description,
    d.services_offered,
    d.vehicle_equipment,
    d.working_sectors,
    d.vehicle_photos,
    d.gallery_photos,
    d.rating,
    d.total_rides,
    d.max_passengers,
    d.display_driver_name,
    d.display_company_name,
    d.show_phone,
    d.show_email,
    d.card_photo_url,
    d.is_pioneer,
    d.vehicle_category,
    d.status,
    d.created_at,
    d.base_rate,
    d.per_km_rate,
    d.contact_phone,
    d.contact_email,
    d.show_rating_public,
    p.full_name AS profile_full_name,
    p.profile_photo_url AS profile_photo_url,
    CASE WHEN d.show_phone = true THEN p.phone ELSE NULL END AS profile_phone,
    CASE WHEN d.show_email = true THEN p.email ELSE NULL END AS profile_email
  FROM drivers d
  LEFT JOIN profiles p ON d.user_id = p.id
  WHERE d.id = driver_id_param
    AND d.public_profile_enabled = true
    AND public.driver_should_be_visible(
      d.status, d.is_pioneer, d.free_access_end_date,
      d.subscription_paid, d.subscription_status, d.free_access_granted,
      d.created_at, d.is_fleet_driver, d.fleet_manager_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_driver_profile_by_id TO anon, authenticated;
