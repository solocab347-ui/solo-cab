
-- Approche simplifiée: ajouter le filtre is_demo_account directement dans les vues
-- sans modifier la fonction driver_should_be_visible

-- Supprimer les vues existantes
DROP VIEW IF EXISTS public_driver_profiles CASCADE;
DROP VIEW IF EXISTS drivers_visible_to_companies CASCADE;
DROP VIEW IF EXISTS drivers_visible_to_fleet_managers CASCADE;
DROP VIEW IF EXISTS drivers_available_for_sharing CASCADE;
DROP VIEW IF EXISTS fleet_searchable_drivers CASCADE;

-- Vue principale pour les profils publics - avec filtre is_demo_account
CREATE VIEW public_driver_profiles
WITH (security_invoker=on) AS
SELECT 
  d.id,
  d.user_id,
  d.company_name,
  d.bio,
  d.service_description,
  d.services_offered,
  d.vehicle_equipment,
  d.working_sectors,
  d.vehicle_photos,
  d.gallery_photos,
  d.rating,
  d.total_rides,
  d.vehicle_brand,
  d.vehicle_model,
  d.vehicle_color,
  d.vehicle_year,
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
  );

-- Vue pour les entreprises
CREATE VIEW drivers_visible_to_companies
WITH (security_invoker=on) AS
SELECT 
  d.id,
  d.user_id,
  d.company_name,
  d.bio,
  d.service_description,
  d.services_offered,
  d.vehicle_equipment,
  d.working_sectors,
  d.vehicle_photos,
  d.gallery_photos,
  d.rating,
  d.total_rides,
  d.vehicle_brand,
  d.vehicle_model,
  d.vehicle_color,
  d.vehicle_year,
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
WHERE d.visible_to_companies = true
  AND COALESCE(d.is_demo_account, false) = false
  AND public.driver_should_be_visible(
    d.status, d.is_pioneer, d.free_access_end_date,
    d.subscription_paid, d.subscription_status, d.free_access_granted,
    d.created_at, d.is_fleet_driver, d.fleet_manager_id
  );

-- Vue pour les gestionnaires de flotte
CREATE VIEW drivers_visible_to_fleet_managers
WITH (security_invoker=on) AS
SELECT 
  d.id,
  d.user_id,
  d.company_name,
  d.bio,
  d.service_description,
  d.services_offered,
  d.vehicle_equipment,
  d.working_sectors,
  d.vehicle_photos,
  d.gallery_photos,
  d.rating,
  d.total_rides,
  d.vehicle_brand,
  d.vehicle_model,
  d.vehicle_color,
  d.vehicle_year,
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
WHERE d.visible_to_fleet_managers = true
  AND COALESCE(d.is_demo_account, false) = false
  AND public.driver_should_be_visible(
    d.status, d.is_pioneer, d.free_access_end_date,
    d.subscription_paid, d.subscription_status, d.free_access_granted,
    d.created_at, d.is_fleet_driver, d.fleet_manager_id
  );

-- Vue pour la recherche de partenariat entre chauffeurs
CREATE VIEW drivers_available_for_sharing
WITH (security_invoker=on) AS
SELECT 
  d.id,
  d.user_id,
  d.company_name,
  d.bio,
  d.service_description,
  d.services_offered,
  d.vehicle_equipment,
  d.working_sectors,
  d.vehicle_photos,
  d.gallery_photos,
  d.rating,
  d.total_rides,
  d.vehicle_brand,
  d.vehicle_model,
  d.vehicle_color,
  d.vehicle_year,
  d.max_passengers,
  d.display_driver_name,
  d.display_company_name,
  d.show_phone,
  d.show_email,
  d.card_photo_url,
  d.is_pioneer,
  d.vehicle_category,
  d.status,
  d.stripe_connect_account_id,
  d.created_at,
  p.full_name,
  p.profile_photo_url
FROM drivers d
JOIN profiles p ON d.user_id = p.id
WHERE d.visible_to_drivers = true
  AND COALESCE(d.is_demo_account, false) = false
  AND public.driver_should_be_visible(
    d.status, d.is_pioneer, d.free_access_end_date,
    d.subscription_paid, d.subscription_status, d.free_access_granted,
    d.created_at, d.is_fleet_driver, d.fleet_manager_id
  );

-- Vue pour la recherche de flotte
CREATE VIEW fleet_searchable_drivers
WITH (security_invoker=on) AS
SELECT 
  d.id,
  d.user_id,
  d.company_name,
  d.bio,
  d.service_description,
  d.services_offered,
  d.vehicle_equipment,
  d.working_sectors,
  d.vehicle_photos,
  d.gallery_photos,
  d.rating,
  d.total_rides,
  d.vehicle_brand,
  d.vehicle_model,
  d.vehicle_color,
  d.vehicle_year,
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
  p.full_name,
  p.profile_photo_url
FROM drivers d
JOIN profiles p ON d.user_id = p.id
WHERE d.visible_to_fleet_managers = true
  AND COALESCE(d.is_demo_account, false) = false
  AND public.driver_should_be_visible(
    d.status, d.is_pioneer, d.free_access_end_date,
    d.subscription_paid, d.subscription_status, d.free_access_granted,
    d.created_at, d.is_fleet_driver, d.fleet_manager_id
  );

-- Mettre à jour get_drivers_with_full_access pour inclure le filtre is_demo_account
DROP FUNCTION IF EXISTS public.get_drivers_with_full_access(text, integer);

CREATE FUNCTION public.get_drivers_with_full_access(
  visibility_field text,
  limit_count integer DEFAULT 100
)
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
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format('
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
    WHERE d.%I = true
      AND COALESCE(d.is_demo_account, false) = false
      AND public.driver_should_be_visible(
        d.status, d.is_pioneer, d.free_access_end_date,
        d.subscription_paid, d.subscription_status, d.free_access_granted,
        d.created_at, d.is_fleet_driver, d.fleet_manager_id
      )
    ORDER BY d.rating DESC NULLS LAST, d.created_at DESC
    LIMIT $1
  ', visibility_field) USING limit_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.driver_should_be_visible TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_drivers_with_full_access TO anon, authenticated;
GRANT SELECT ON public_driver_profiles TO anon, authenticated;
GRANT SELECT ON drivers_visible_to_companies TO authenticated;
GRANT SELECT ON drivers_visible_to_fleet_managers TO authenticated;
GRANT SELECT ON drivers_available_for_sharing TO authenticated;
GRANT SELECT ON fleet_searchable_drivers TO authenticated;
