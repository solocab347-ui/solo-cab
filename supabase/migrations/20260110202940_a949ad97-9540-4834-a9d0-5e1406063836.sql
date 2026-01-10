
-- ==============================================
-- CORRECTION: Accès complet pendant période de grâce 30 jours
-- Règle métier: TOUS les chauffeurs inscrits ont 30 jours d'accès complet
-- Après 30j sans documents validés -> espace restreint
-- ==============================================

-- 1. Recréer la vue drivers_available_for_sharing avec période de grâce
DROP VIEW IF EXISTS public.drivers_available_for_sharing;

CREATE VIEW public.drivers_available_for_sharing AS
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
    d.show_rating_partners,
    p.full_name,
    p.profile_photo_url,
    CASE WHEN d.show_phone_for_sharing = true THEN p.phone ELSE NULL END AS phone,
    CASE WHEN d.show_email = true THEN p.email ELSE NULL END AS email
FROM drivers d
JOIN profiles p ON d.user_id = p.id
WHERE d.visible_to_drivers = true 
  AND d.is_fleet_driver IS NOT TRUE 
  AND d.fleet_manager_id IS NULL
  AND (
    -- Chauffeur validé
    d.status = 'validated'
    -- OU Pionnier avec essai actif
    OR (d.is_pioneer = true AND d.free_access_end_date > NOW())
    -- OU Tout nouveau chauffeur dans les 30 jours (période de grâce)
    OR (d.created_at > NOW() - INTERVAL '30 days' AND d.status IN ('pending', 'validated'))
  );

-- 2. Recréer la vue public_driver_profiles avec période de grâce complète
DROP VIEW IF EXISTS public.public_driver_profiles;

CREATE VIEW public.public_driver_profiles AS
SELECT 
    id,
    user_id,
    company_name,
    vehicle_model,
    vehicle_brand,
    vehicle_color,
    vehicle_year,
    bio,
    service_description,
    services_offered,
    vehicle_equipment,
    working_sectors,
    vehicle_photos,
    gallery_photos,
    rating,
    total_rides,
    max_passengers,
    display_driver_name,
    display_company_name,
    show_phone,
    show_email,
    card_photo_url,
    is_pioneer
FROM drivers d
WHERE public_profile_enabled = true
  AND (is_fleet_driver IS NULL OR is_fleet_driver = false)
  AND fleet_manager_id IS NULL
  AND (
    -- Chauffeur validé
    status = 'validated'
    -- OU Pionnier avec essai actif
    OR (is_pioneer = true AND free_access_end_date > NOW())
    -- OU Tout nouveau chauffeur dans les 30 jours (période de grâce)
    OR (created_at > NOW() - INTERVAL '30 days' AND status IN ('pending', 'validated'))
  );

-- 3. Corriger la fonction get_safe_public_driver_data avec période de grâce
CREATE OR REPLACE FUNCTION public.get_safe_public_driver_data(driver_id_param uuid)
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
  card_photo_url text
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
    d.card_photo_url
  FROM drivers d
  WHERE d.id = driver_id_param
    AND d.public_profile_enabled = true
    AND (
      -- Chauffeur validé
      d.status = 'validated'
      -- OU Pionnier avec essai actif
      OR (d.is_pioneer = true AND d.free_access_end_date > NOW())
      -- OU Tout nouveau chauffeur dans les 30 jours (période de grâce)
      OR (d.created_at > NOW() - INTERVAL '30 days' AND d.status IN ('pending', 'validated'))
    );
END;
$$;

-- 4. Créer une fonction helper pour vérifier si un chauffeur a accès complet
CREATE OR REPLACE FUNCTION public.driver_has_full_access(driver_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  driver_record RECORD;
BEGIN
  SELECT 
    status,
    is_pioneer,
    free_access_end_date,
    created_at
  INTO driver_record
  FROM drivers
  WHERE id = driver_id_param;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Chauffeur validé = accès complet
  IF driver_record.status = 'validated' THEN
    RETURN TRUE;
  END IF;
  
  -- Pionnier avec essai actif = accès complet
  IF driver_record.is_pioneer = true AND driver_record.free_access_end_date > NOW() THEN
    RETURN TRUE;
  END IF;
  
  -- Nouveau chauffeur dans les 30 jours = accès complet
  IF driver_record.created_at > NOW() - INTERVAL '30 days' 
     AND driver_record.status IN ('pending', 'validated') THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.driver_has_full_access(UUID) TO anon, authenticated;

-- 5. Mettre à jour l'index pour optimiser les recherches avec période de grâce
DROP INDEX IF EXISTS idx_drivers_sharing_visibility;
CREATE INDEX idx_drivers_sharing_visibility 
  ON public.drivers (visible_to_drivers, status, created_at, is_pioneer, free_access_end_date)
  WHERE visible_to_drivers = true;

-- 6. S'assurer que sharing_available est bien synchronisé
CREATE OR REPLACE FUNCTION sync_sharing_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Si visible_to_drivers est activé, activer aussi sharing_available
  IF NEW.visible_to_drivers = true THEN
    NEW.sharing_available := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger
DROP TRIGGER IF EXISTS trigger_sync_sharing_availability ON drivers;
CREATE TRIGGER trigger_sync_sharing_availability
BEFORE INSERT OR UPDATE OF visible_to_drivers ON drivers
FOR EACH ROW
EXECUTE FUNCTION sync_sharing_availability();

-- 7. Mettre à jour les chauffeurs existants en période de grâce
UPDATE drivers 
SET sharing_available = true
WHERE visible_to_drivers = true
  AND sharing_available IS NOT TRUE;
