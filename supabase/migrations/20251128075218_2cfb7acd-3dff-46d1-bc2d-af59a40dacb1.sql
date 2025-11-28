-- ============================================================================
-- CORRECTION FONCTION search_drivers_by_location - Retirer données sensibles
-- ============================================================================

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.search_drivers_by_location(text, text, numeric, numeric, numeric);

-- Recréer la fonction en retirant base_rate, per_km_rate, home_address
CREATE OR REPLACE FUNCTION public.search_drivers_by_location(
  _city text DEFAULT NULL,
  _address text DEFAULT NULL,
  _latitude numeric DEFAULT NULL,
  _longitude numeric DEFAULT NULL,
  _max_radius_km numeric DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  profile_photo_url text,
  vehicle_model text,
  vehicle_color text,
  vehicle_brand text,
  vehicle_year integer,
  vehicle_photos text[],
  gallery_photos text[],
  bio text,
  rating numeric,
  total_rides integer,
  working_sectors text[],
  service_description text,
  distance_km numeric,
  company_name text,
  display_driver_name boolean,
  display_company_name boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_lat NUMERIC;
  search_lon NUMERIC;
BEGIN
  RAISE NOTICE '🔍 Recherche avec: city=%, address=%, lat=%, lon=%, rayon=% km', 
    _city, _address, _latitude, _longitude, _max_radius_km;

  -- Utiliser les coordonnées fournies
  search_lat := _latitude;
  search_lon := _longitude;

  -- Retourner les chauffeurs dans le rayon avec calcul de distance
  -- SÉCURITÉ: Colonnes sensibles retirées (base_rate, per_km_rate, home_address)
  RETURN QUERY
  SELECT 
    d.id,
    d.user_id,
    p.full_name,
    p.profile_photo_url,
    d.vehicle_model,
    d.vehicle_color,
    d.vehicle_brand,
    d.vehicle_year,
    d.vehicle_photos,
    d.gallery_photos,
    d.bio,
    d.rating,
    d.total_rides,
    d.working_sectors,
    d.service_description,
    -- Calcul de distance Haversine
    (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(search_lat)) 
          * cos(radians(d.home_latitude)) 
          * cos(radians(d.home_longitude) - radians(search_lon)) 
          + sin(radians(search_lat)) 
          * sin(radians(d.home_latitude))
        ))
      )
    )::NUMERIC AS distance_km,
    d.company_name,
    d.display_driver_name,
    d.display_company_name
  FROM drivers d
  INNER JOIN profiles p ON p.id = d.user_id
  WHERE 
    d.public_profile_enabled = true
    AND d.status = 'validated'
    AND d.home_latitude IS NOT NULL
    AND d.home_longitude IS NOT NULL
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(search_lat)) 
          * cos(radians(d.home_latitude)) 
          * cos(radians(d.home_longitude) - radians(search_lon)) 
          + sin(radians(search_lat)) 
          * sin(radians(d.home_latitude))
        ))
      )
    ) <= _max_radius_km
  ORDER BY distance_km ASC;

  RAISE NOTICE '✅ Recherche terminée';
END;
$$;

COMMENT ON FUNCTION search_drivers_by_location IS 
'Fonction publique sécurisée de recherche géographique de chauffeurs. Exclut les données sensibles (tarifs, adresse domicile).';