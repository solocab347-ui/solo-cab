
-- Fix the simpler overload that doesn't filter by driver_status
CREATE OR REPLACE FUNCTION public.find_nearby_available_drivers(
  p_pickup_lat double precision,
  p_pickup_lon double precision,
  p_radius_km double precision,
  p_exclude_driver_ids uuid[],
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  driver_id uuid,
  distance_km double precision,
  company_name text,
  user_id uuid
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id as driver_id,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_pickup_lon, p_pickup_lat), 4326)::geography
    ) / 1000.0 as distance_km,
    d.company_name,
    d.user_id
  FROM drivers d
  WHERE d.status = 'validated'
    AND d.is_available_now = true
    AND d.driver_status IN ('online', 'online_available')
    AND d.current_latitude IS NOT NULL
    AND d.current_longitude IS NOT NULL
    AND d.id != ALL(p_exclude_driver_ids)
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_pickup_lon, p_pickup_lat), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT p_limit;
$$;
