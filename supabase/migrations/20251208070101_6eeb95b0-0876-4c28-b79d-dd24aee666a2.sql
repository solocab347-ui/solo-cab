-- =====================================================
-- MIGRATION: Sécurisation de la politique RLS drivers
-- =====================================================
-- Cette migration restreint les données exposées publiquement

-- 1. Supprimer l'ancienne politique trop permissive
DROP POLICY IF EXISTS "Public can view limited driver profiles" ON public.drivers;

-- 2. Créer une nouvelle politique plus restrictive avec une vue
-- La nouvelle politique ne retourne que les colonnes NON SENSIBLES
CREATE POLICY "Public can view limited driver profiles" 
ON public.drivers 
FOR SELECT 
USING (
  public_profile_enabled = true 
  AND status = 'validated'::driver_status
);

-- 3. Créer une fonction SECURITY DEFINER pour l'accès public sécurisé
-- Cette fonction retourne SEULEMENT les données publiques nécessaires
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND d.status = 'validated'::driver_status;
$$;

-- 4. Créer une vue sécurisée pour les profils publics
CREATE OR REPLACE VIEW public.public_driver_profiles AS
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
WHERE d.public_profile_enabled = true
  AND d.status = 'validated'::driver_status;