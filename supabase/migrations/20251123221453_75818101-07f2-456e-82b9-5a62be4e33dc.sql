-- Améliorer la fonction de recherche avec meilleur logging et calcul de distance
DROP FUNCTION IF EXISTS public.search_drivers_by_location(text, text, numeric, numeric, integer);

CREATE OR REPLACE FUNCTION public.search_drivers_by_location(
  _city text DEFAULT NULL,
  _address text DEFAULT NULL,
  _latitude numeric DEFAULT NULL,
  _longitude numeric DEFAULT NULL,
  _max_radius_km integer DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  full_name text,
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
  base_rate numeric,
  per_km_rate numeric,
  profile_photo_url text,
  home_address text,
  distance_km numeric,
  company_name text,
  display_driver_name boolean,
  display_company_name boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si des coordonnées sont fournies, recherche par distance
  IF _latitude IS NOT NULL AND _longitude IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      d.id,
      p.full_name,
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
      p.profile_photo_url,
      d.home_address,
      -- Formule de Haversine pour calculer la distance en kilomètres
      ROUND(
        (6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(_latitude::float)) * 
            cos(radians(d.home_latitude::float)) * 
            cos(radians(d.home_longitude::float) - radians(_longitude::float)) + 
            sin(radians(_latitude::float)) * 
            sin(radians(d.home_latitude::float))
          ))
        ))::numeric,
        2
      ) AS distance_km,
      d.company_name,
      d.display_driver_name,
      d.display_company_name
    FROM public.drivers d
    JOIN public.profiles p ON d.user_id = p.id
    WHERE 
      d.public_profile_enabled = true 
      AND d.status = 'validated'
      AND d.home_latitude IS NOT NULL
      AND d.home_longitude IS NOT NULL
      -- Filtre par distance calculée
      AND (
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(_latitude::float)) * 
            cos(radians(d.home_latitude::float)) * 
            cos(radians(d.home_longitude::float) - radians(_longitude::float)) + 
            sin(radians(_latitude::float)) * 
            sin(radians(d.home_latitude::float))
          ))
        )
      ) <= _max_radius_km
    ORDER BY distance_km ASC
    LIMIT 50;
    
  -- Recherche par ville uniquement (sans coordonnées précises)
  ELSIF _city IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      d.id,
      p.full_name,
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
      p.profile_photo_url,
      d.home_address,
      NULL::numeric AS distance_km,
      d.company_name,
      d.display_driver_name,
      d.display_company_name
    FROM public.drivers d
    JOIN public.profiles p ON d.user_id = p.id
    WHERE 
      d.public_profile_enabled = true 
      AND d.status = 'validated'
      AND (
        _city ILIKE ANY(d.working_sectors)
        OR d.home_address ILIKE '%' || _city || '%'
      )
    ORDER BY d.rating DESC, d.total_rides DESC
    LIMIT 50;
    
  -- Sinon, retourner tous les chauffeurs publics
  ELSE
    RETURN QUERY
    SELECT 
      d.id,
      p.full_name,
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
      p.profile_photo_url,
      d.home_address,
      NULL::numeric AS distance_km,
      d.company_name,
      d.display_driver_name,
      d.display_company_name
    FROM public.drivers d
    JOIN public.profiles p ON d.user_id = p.id
    WHERE 
      d.public_profile_enabled = true 
      AND d.status = 'validated'
    ORDER BY d.rating DESC, d.total_rides DESC
    LIMIT 50;
  END IF;
END;
$$;