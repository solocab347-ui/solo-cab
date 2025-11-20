-- Add geolocation fields to drivers table for proximity search
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS home_address TEXT,
ADD COLUMN IF NOT EXISTS home_latitude NUMERIC,
ADD COLUMN IF NOT EXISTS home_longitude NUMERIC;

-- Create improved search function with progressive radius expansion
CREATE OR REPLACE FUNCTION public.search_drivers_by_location(
  _city TEXT DEFAULT NULL,
  _address TEXT DEFAULT NULL,
  _latitude NUMERIC DEFAULT NULL,
  _longitude NUMERIC DEFAULT NULL,
  _max_radius_km INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  bio TEXT,
  rating NUMERIC,
  total_rides INTEGER,
  working_sectors TEXT[],
  service_description TEXT,
  base_rate NUMERIC,
  per_km_rate NUMERIC,
  profile_photo_url TEXT,
  home_address TEXT,
  distance_km NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_radius INTEGER := 0;
  result_count INTEGER := 0;
BEGIN
  -- If coordinates provided, search with progressive radius expansion
  IF _latitude IS NOT NULL AND _longitude IS NOT NULL THEN
    -- Loop through radius increments of 10km until we find drivers or reach max
    WHILE current_radius <= _max_radius_km AND result_count = 0 LOOP
      current_radius := current_radius + 10;
      
      RETURN QUERY
      SELECT 
        d.id,
        p.full_name,
        d.vehicle_model,
        d.vehicle_color,
        d.bio,
        d.rating,
        d.total_rides,
        d.working_sectors,
        d.service_description,
        d.base_rate,
        d.per_km_rate,
        p.profile_photo_url,
        d.home_address,
        -- Calculate distance using Haversine formula (approximate)
        (
          6371 * acos(
            cos(radians(_latitude)) * 
            cos(radians(d.home_latitude)) * 
            cos(radians(d.home_longitude) - radians(_longitude)) + 
            sin(radians(_latitude)) * 
            sin(radians(d.home_latitude))
          )
        )::NUMERIC(10,2) AS distance_km
      FROM public.drivers d
      JOIN public.profiles p ON d.user_id = p.id
      WHERE 
        d.public_profile_enabled = true 
        AND d.status = 'validated'
        AND d.home_latitude IS NOT NULL
        AND d.home_longitude IS NOT NULL
        -- Filter by calculated distance
        AND (
          6371 * acos(
            cos(radians(_latitude)) * 
            cos(radians(d.home_latitude)) * 
            cos(radians(d.home_longitude) - radians(_longitude)) + 
            sin(radians(_latitude)) * 
            sin(radians(d.home_latitude))
          )
        ) <= current_radius
      ORDER BY distance_km ASC
      LIMIT 20;
      
      -- Check if we found any results
      GET DIAGNOSTICS result_count = ROW_COUNT;
    END LOOP;
  
  -- If city search, look for drivers in working sectors matching the city
  ELSIF _city IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      d.id,
      p.full_name,
      d.vehicle_model,
      d.vehicle_color,
      d.bio,
      d.rating,
      d.total_rides,
      d.working_sectors,
      d.service_description,
      d.base_rate,
      d.per_km_rate,
      p.profile_photo_url,
      d.home_address,
      NULL::NUMERIC AS distance_km
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
    LIMIT 20;
  
  -- Otherwise return all public drivers
  ELSE
    RETURN QUERY
    SELECT 
      d.id,
      p.full_name,
      d.vehicle_model,
      d.vehicle_color,
      d.bio,
      d.rating,
      d.total_rides,
      d.working_sectors,
      d.service_description,
      d.base_rate,
      d.per_km_rate,
      p.profile_photo_url,
      d.home_address,
      NULL::NUMERIC AS distance_km
    FROM public.drivers d
    JOIN public.profiles p ON d.user_id = p.id
    WHERE 
      d.public_profile_enabled = true 
      AND d.status = 'validated'
    ORDER BY d.rating DESC, d.total_rides DESC
    LIMIT 20;
  END IF;
END;
$$;