
CREATE OR REPLACE FUNCTION public.find_nearby_available_drivers(
  p_pickup_lat double precision,
  p_pickup_lon double precision,
  p_radius_km double precision DEFAULT 30,
  p_limit integer DEFAULT 10,
  p_exclude_driver_ids uuid[] DEFAULT '{}'::uuid[],
  p_scheduled_date timestamptz DEFAULT NULL
)
RETURNS TABLE(driver_id uuid, distance_km double precision, company_name text, user_id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
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
    AND d.current_latitude IS NOT NULL
    AND d.current_longitude IS NOT NULL
    AND d.id != ALL(p_exclude_driver_ids)
    AND d.driver_status != 'break'
    AND (
      -- Immediate course: only online drivers
      (p_scheduled_date IS NULL OR p_scheduled_date < (now() + interval '2 hours'))
      AND d.is_available_now = true
      AND d.driver_status = 'online'
      
      OR
      
      -- Future reservation (>2h): include offline/assigned/in_ride drivers who accept future bookings
      (p_scheduled_date IS NOT NULL AND p_scheduled_date >= (now() + interval '2 hours'))
      AND d.driver_status IN ('online', 'offline', 'assigned', 'in_ride')
      AND COALESCE(d.accept_future_bookings, true) = true
    )
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(d.current_longitude, d.current_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_pickup_lon, p_pickup_lat), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY 
    -- Prioritize online drivers for future reservations too
    CASE d.driver_status WHEN 'online' THEN 0 WHEN 'offline' THEN 1 WHEN 'assigned' THEN 2 WHEN 'in_ride' THEN 3 END,
    distance_km ASC
  LIMIT p_limit;
$$;
