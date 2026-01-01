-- Modifier la fonction search_drivers_by_location pour exclure les chauffeurs affiliés à une flotte
-- qui les affiche dans leur vitrine publique (éviter les doublons)

CREATE OR REPLACE FUNCTION public.search_drivers_by_location(
  _city text DEFAULT NULL::text, 
  _address text DEFAULT NULL::text, 
  _latitude numeric DEFAULT NULL::numeric, 
  _longitude numeric DEFAULT NULL::numeric, 
  _max_radius_km numeric DEFAULT 50
)
RETURNS TABLE(
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
  display_company_name boolean, 
  show_rating_public boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  -- ANTI-DOUBLON: Exclure les chauffeurs affiliés à une flotte qui les affiche publiquement
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
    d.display_company_name,
    COALESCE(d.show_rating_public, false) AS show_rating_public
  FROM drivers d
  INNER JOIN profiles p ON p.id = d.user_id
  WHERE 
    d.public_profile_enabled = true
    AND d.status = 'validated'
    AND d.home_latitude IS NOT NULL
    AND d.home_longitude IS NOT NULL
    -- Exclure les chauffeurs affiliés à une flotte visible publiquement
    AND NOT EXISTS (
      SELECT 1 
      FROM fleet_manager_drivers fmd
      JOIN fleet_managers fm ON fm.id = fmd.fleet_manager_id
      WHERE fmd.driver_id = d.id
        AND fmd.status = 'active'
        AND fmd.visible_in_storefront = true
        AND fm.show_drivers_in_public_storefront = true
        AND fm.status = 'active'
    )
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

  RAISE NOTICE '✅ Recherche terminée (chauffeurs affiliés à une flotte visible exclus)';
END;
$function$;