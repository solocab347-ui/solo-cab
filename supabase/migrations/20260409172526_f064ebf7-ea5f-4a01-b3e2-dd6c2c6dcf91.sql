
-- Recreate get_drivers_with_full_access without visibility_field filter
-- All validated drivers are now always visible
DROP FUNCTION IF EXISTS public.get_drivers_with_full_access(text, integer);

CREATE OR REPLACE FUNCTION public.get_drivers_with_full_access(
  visibility_field text DEFAULT NULL,
  limit_count integer DEFAULT 100
)
RETURNS TABLE (
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
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- visibility_field parameter is kept for backward compatibility but ignored
  -- All validated drivers are now visible regardless of visibility toggles
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
      d.created_at
    FROM drivers d
    WHERE d.public_profile_enabled = true
      AND COALESCE(d.is_demo_account, false) = false
      AND public.driver_should_be_visible(
        d.status, d.is_pioneer, d.free_access_end_date,
        d.subscription_paid, d.subscription_status, d.free_access_granted,
        d.created_at, d.is_fleet_driver, d.fleet_manager_id
      )
    ORDER BY d.rating DESC NULLS LAST, d.created_at DESC
    LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_drivers_with_full_access TO anon, authenticated;
