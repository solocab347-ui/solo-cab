
-- 1. CRÉER LA FONCTION HELPER pour déterminer si un chauffeur doit être visible
CREATE OR REPLACE FUNCTION public.driver_should_be_visible(
  p_status driver_status,
  p_is_pioneer boolean,
  p_free_access_end_date timestamptz,
  p_subscription_paid boolean,
  p_subscription_status text,
  p_free_access_granted boolean,
  p_created_at timestamptz,
  p_is_fleet_driver boolean,
  p_fleet_manager_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Les chauffeurs de flotte ne sont jamais visibles publiquement
  IF p_is_fleet_driver = true OR p_fleet_manager_id IS NOT NULL THEN
    RETURN false;
  END IF;
  
  -- Chauffeur validé = toujours visible
  IF p_status = 'validated' THEN
    RETURN true;
  END IF;
  
  -- Pionnier avec accès gratuit actif = visible
  IF p_is_pioneer = true AND p_free_access_end_date > now() THEN
    RETURN true;
  END IF;
  
  -- Accès gratuit accordé par admin = visible
  IF p_free_access_granted = true THEN
    RETURN true;
  END IF;
  
  -- Abonnement payant actif = visible
  IF p_subscription_paid = true AND p_subscription_status = 'active' THEN
    RETURN true;
  END IF;
  
  -- Nouveau chauffeur (< 30 jours) avec statut pending, validated, ou on_hold = visible
  IF p_created_at > (now() - interval '30 days') 
     AND p_status IN ('pending', 'validated', 'on_hold') THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 2. RECRÉER LA VUE public_driver_profiles avec SECURITY INVOKER
DROP VIEW IF EXISTS public_driver_profiles CASCADE;

CREATE VIEW public_driver_profiles
WITH (security_invoker = on)
AS SELECT 
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
  AND public.driver_should_be_visible(
    d.status, d.is_pioneer, d.free_access_end_date,
    d.subscription_paid, d.subscription_status, d.free_access_granted,
    d.created_at, d.is_fleet_driver, d.fleet_manager_id
  );

-- 3. RECRÉER LA VUE drivers_visible_to_companies
DROP VIEW IF EXISTS drivers_visible_to_companies CASCADE;

CREATE VIEW drivers_visible_to_companies
WITH (security_invoker = on)
AS SELECT d.*
FROM drivers d
WHERE d.visible_to_companies = true
  AND public.driver_should_be_visible(
    d.status, d.is_pioneer, d.free_access_end_date,
    d.subscription_paid, d.subscription_status, d.free_access_granted,
    d.created_at, d.is_fleet_driver, d.fleet_manager_id
  );

-- 4. RECRÉER LA VUE drivers_visible_to_fleet_managers
DROP VIEW IF EXISTS drivers_visible_to_fleet_managers CASCADE;

CREATE VIEW drivers_visible_to_fleet_managers
WITH (security_invoker = on)
AS SELECT d.*
FROM drivers d
WHERE d.visible_to_fleet_managers = true
  AND public.driver_should_be_visible(
    d.status, d.is_pioneer, d.free_access_end_date,
    d.subscription_paid, d.subscription_status, d.free_access_granted,
    d.created_at, d.is_fleet_driver, d.fleet_manager_id
  );

-- 5. RECRÉER LA VUE drivers_available_for_sharing
DROP VIEW IF EXISTS drivers_available_for_sharing CASCADE;

CREATE VIEW drivers_available_for_sharing
WITH (security_invoker = on)
AS SELECT 
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
  d.show_rating_partners,
  d.vehicle_category,
  p.full_name,
  p.profile_photo_url,
  CASE WHEN d.show_phone_for_sharing = true THEN p.phone ELSE NULL END AS phone,
  CASE WHEN d.show_email = true THEN p.email ELSE NULL END AS email
FROM drivers d
JOIN profiles p ON d.user_id = p.id
WHERE d.visible_to_drivers = true
  AND public.driver_should_be_visible(
    d.status, d.is_pioneer, d.free_access_end_date,
    d.subscription_paid, d.subscription_status, d.free_access_granted,
    d.created_at, d.is_fleet_driver, d.fleet_manager_id
  );

-- 6. RECRÉER LA VUE fleet_searchable_drivers
DROP VIEW IF EXISTS fleet_searchable_drivers CASCADE;

CREATE VIEW fleet_searchable_drivers
WITH (security_invoker = on)
AS SELECT 
  d.id,
  d.user_id,
  d.company_name,
  d.vehicle_brand,
  d.vehicle_model,
  d.vehicle_category,
  d.working_sectors,
  d.rating,
  d.total_rides,
  d.services_offered,
  d.vehicle_equipment,
  d.show_rating_partners,
  d.service_description,
  p.full_name,
  p.profile_photo_url
FROM drivers d
JOIN profiles p ON d.user_id = p.id
WHERE d.visible_to_fleet_managers = true
  AND public.driver_should_be_visible(
    d.status, d.is_pioneer, d.free_access_end_date,
    d.subscription_paid, d.subscription_status, d.free_access_granted,
    d.created_at, d.is_fleet_driver, d.fleet_manager_id
  );

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.driver_should_be_visible TO anon, authenticated;
GRANT SELECT ON public_driver_profiles TO anon, authenticated;
GRANT SELECT ON drivers_visible_to_companies TO authenticated;
GRANT SELECT ON drivers_visible_to_fleet_managers TO authenticated;
GRANT SELECT ON drivers_available_for_sharing TO authenticated;
GRANT SELECT ON fleet_searchable_drivers TO authenticated;
