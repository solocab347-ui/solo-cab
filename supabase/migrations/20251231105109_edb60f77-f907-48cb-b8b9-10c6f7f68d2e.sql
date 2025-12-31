-- Mettre à jour la fonction search_drivers_by_location pour inclure show_rating_public
DROP FUNCTION IF EXISTS search_drivers_by_location(text, text, numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION search_drivers_by_location(
  _city TEXT DEFAULT NULL,
  _address TEXT DEFAULT NULL,
  _latitude NUMERIC DEFAULT NULL,
  _longitude NUMERIC DEFAULT NULL,
  _max_radius_km NUMERIC DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  profile_photo_url TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  vehicle_brand TEXT,
  vehicle_year INTEGER,
  vehicle_photos TEXT[],
  gallery_photos TEXT[],
  bio TEXT,
  rating NUMERIC,
  total_rides INTEGER,
  working_sectors TEXT[],
  service_description TEXT,
  distance_km NUMERIC,
  company_name TEXT,
  display_driver_name BOOLEAN,
  display_company_name BOOLEAN,
  show_rating_public BOOLEAN
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
    d.display_company_name,
    COALESCE(d.show_rating_public, false) AS show_rating_public
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