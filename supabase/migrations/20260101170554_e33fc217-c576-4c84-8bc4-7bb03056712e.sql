-- Restaurer la fonction search_drivers_by_location SANS exclure les chauffeurs affiliés
-- Les chauffeurs peuvent apparaître à la fois en indépendant ET dans une flotte

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
  search_lat := _latitude;
  search_lon := _longitude;

  -- Retourner TOUS les chauffeurs publics dans le rayon
  -- Un chauffeur peut être à la fois indépendant ET dans une flotte
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
END;
$function$;