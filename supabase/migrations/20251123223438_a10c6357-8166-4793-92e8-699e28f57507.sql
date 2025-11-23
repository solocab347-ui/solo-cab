-- Modifier la fonction search_drivers_by_location pour inclure user_id
DROP FUNCTION IF EXISTS public.search_drivers_by_location;

CREATE OR REPLACE FUNCTION public.search_drivers_by_location(
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
  base_rate NUMERIC,
  per_km_rate NUMERIC,
  home_address TEXT,
  distance_km NUMERIC,
  company_name TEXT,
  display_driver_name BOOLEAN,
  display_company_name BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Retourner les chauffeurs dans le rayon avec calcul de distance corrigé
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
    d.base_rate,
    d.per_km_rate,
    d.home_address,
    -- Calcul de distance Haversine corrigé
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

-- Activer le realtime sur la table drivers pour les mises à jour en temps réel
ALTER TABLE public.drivers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;

-- Activer le realtime sur la table profiles pour les mises à jour de photo de profil
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;