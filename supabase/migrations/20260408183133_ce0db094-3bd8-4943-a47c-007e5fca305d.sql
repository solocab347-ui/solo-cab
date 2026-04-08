
-- Drop the old overload with integer p_max_radius_km
DROP FUNCTION IF EXISTS public.find_nearby_drivers(double precision, double precision, integer, integer, text);
