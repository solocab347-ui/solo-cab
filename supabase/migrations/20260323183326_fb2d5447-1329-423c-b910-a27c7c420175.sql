CREATE OR REPLACE FUNCTION public.find_nearby_drivers(
  p_latitude numeric,
  p_longitude numeric,
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
  latitude numeric,
  longitude numeric,
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
      CASE
        WHEN v_mode = 'immediate'
          AND d.is_available_now = true
          AND d.current_latitude IS NOT NULL
          AND d.current_longitude IS NOT NULL
          AND d.last_location_update > now() - interval '20 minutes'
        THEN d.current_latitude
        ELSE d.home_latitude
      END AS candidate_latitude,
      CASE
        WHEN v_mode = 'immediate'
          AND d.is_available_now = true
          AND d.current_latitude IS NOT NULL
          AND d.current_longitude IS NOT NULL
          AND d.last_location_update > now() - interval '20 minutes'
        THEN d.current_longitude
        ELSE d.home_longitude
      END AS candidate_longitude,
      CASE
        WHEN v_mode = 'immediate'
          AND d.is_available_now = true
          AND d.current_latitude IS NOT NULL
          AND d.current_longitude IS NOT NULL
          AND d.last_location_update > now() - interval '20 minutes'
        THEN true
        ELSE false
      END AS is_live_location
    FROM public.drivers d
    LEFT JOIN public.profiles p ON p.id = d.user_id
    WHERE d.public_profile_enabled = true
      AND (
        (v_mode = 'immediate' AND d.is_available_now = true AND ((d.current_latitude IS NOT NULL AND d.current_longitude IS NOT NULL) OR (d.home_latitude IS NOT NULL AND d.home_longitude IS NOT NULL)))
        OR
        (v_mode <> 'immediate' AND d.home_latitude IS NOT NULL AND d.home_longitude IS NOT NULL)
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
    ST_Distance(
      ST_SetSRID(ST_MakePoint(cd.candidate_longitude, cd.candidate_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) AS distance_meters,
    v_requested_radius_m / 1000 AS search_radius_used,
    cd.candidate_latitude AS latitude,
    cd.candidate_longitude AS longitude,
    cd.is_live_location
  FROM candidate_drivers cd
  WHERE cd.candidate_latitude IS NOT NULL
    AND cd.candidate_longitude IS NOT NULL
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(cd.candidate_longitude, cd.candidate_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      v_requested_radius_m
    )
  ORDER BY
    CASE WHEN cd.is_live_location THEN 0 ELSE 1 END,
    distance_meters ASC
  LIMIT COALESCE(p_limit, 10);
END;
$$;