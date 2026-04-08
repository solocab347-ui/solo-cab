-- 1) Drop the duplicate numeric-signature function
DROP FUNCTION IF EXISTS public.find_nearby_drivers(numeric, numeric, integer, integer, text);

-- 2) Fix Alexandre's demo flag so he appears in searches
UPDATE public.drivers SET is_demo_account = false WHERE id = 'c33021a4-333d-4231-a32a-98b8593e1526';

-- 3) Recreate the function with improved status handling
CREATE OR REPLACE FUNCTION public.find_nearby_drivers(
  p_latitude double precision,
  p_longitude double precision,
  p_limit integer DEFAULT 10,
  p_max_radius_km integer DEFAULT 20,
  p_mode text DEFAULT 'reservation'
)
RETURNS TABLE(
  driver_id uuid,
  company_name text,
  display_name text,
  profile_photo_url text,
  base_fare numeric,
  per_km_rate numeric,
  minimum_price numeric,
  distance_meters double precision,
  search_radius_used integer,
  latitude double precision,
  longitude double precision,
  is_live_location boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_radius_m integer := GREATEST(5000, LEAST(COALESCE(p_max_radius_km, 20), 200) * 1000);
  v_mode text := lower(COALESCE(p_mode, 'reservation'));
BEGIN
  RETURN QUERY
  WITH candidate_drivers AS (
    SELECT
      d.id,
      d.company_name,
      COALESCE(p.full_name, d.company_name, 'Chauffeur VTC') AS display_name,
      p.profile_photo_url,
      COALESCE(d.base_fare, 0) AS base_fare,
      COALESCE(d.per_km_rate, 0) AS per_km_rate,
      COALESCE(d.minimum_price, 0) AS minimum_price,
      -- For immediate mode: use live GPS if driver is online and GPS is fresh
      CASE
        WHEN v_mode = 'immediate'
          AND d.is_available_now = true
          AND d.driver_status IN ('online', 'online_available')
          AND d.current_latitude IS NOT NULL
          AND d.current_longitude IS NOT NULL
          AND d.last_location_update > now() - interval '20 minutes'
        THEN d.current_latitude
        ELSE d.home_latitude
      END AS candidate_latitude,
      CASE
        WHEN v_mode = 'immediate'
          AND d.is_available_now = true
          AND d.driver_status IN ('online', 'online_available')
          AND d.current_latitude IS NOT NULL
          AND d.current_longitude IS NOT NULL
          AND d.last_location_update > now() - interval '20 minutes'
        THEN d.current_longitude
        ELSE d.home_longitude
      END AS candidate_longitude,
      CASE
        WHEN v_mode = 'immediate'
          AND d.is_available_now = true
          AND d.driver_status IN ('online', 'online_available')
          AND d.current_latitude IS NOT NULL
          AND d.current_longitude IS NOT NULL
          AND d.last_location_update > now() - interval '20 minutes'
        THEN true
        ELSE false
      END AS is_live_location
    FROM public.drivers d
    LEFT JOIN public.profiles p ON p.id = d.user_id
    WHERE d.public_profile_enabled = true
      AND COALESCE(d.is_demo_account, false) = false
      AND (
        -- Immediate: driver must be online/available with GPS or home coords
        (v_mode = 'immediate' 
          AND d.is_available_now = true 
          AND d.driver_status IN ('online', 'online_available')
          AND ((d.current_latitude IS NOT NULL AND d.current_longitude IS NOT NULL) 
               OR (d.home_latitude IS NOT NULL AND d.home_longitude IS NOT NULL)))
        OR
        -- Reservation: any driver with home coords
        (v_mode = 'reservation' AND d.home_latitude IS NOT NULL AND d.home_longitude IS NOT NULL)
      )
  )
  SELECT
    cd.id AS driver_id,
    cd.company_name,
    cd.display_name,
    cd.profile_photo_url,
    cd.base_fare,
    cd.per_km_rate,
    cd.minimum_price,
    ST_DistanceSphere(
      ST_MakePoint(cd.candidate_longitude, cd.candidate_latitude),
      ST_MakePoint(p_longitude, p_latitude)
    ) AS distance_meters,
    v_requested_radius_m AS search_radius_used,
    cd.candidate_latitude AS latitude,
    cd.candidate_longitude AS longitude,
    cd.is_live_location
  FROM candidate_drivers cd
  WHERE cd.candidate_latitude IS NOT NULL
    AND cd.candidate_longitude IS NOT NULL
    AND ST_DistanceSphere(
      ST_MakePoint(cd.candidate_longitude, cd.candidate_latitude),
      ST_MakePoint(p_longitude, p_latitude)
    ) <= v_requested_radius_m
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$;