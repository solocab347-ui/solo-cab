-- Corriger les fonctions avec search_path
CREATE OR REPLACE FUNCTION public.generate_sharing_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sharing_number IS NULL THEN
    NEW.sharing_number := nextval('public.driver_sharing_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.format_sharing_number(num INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN 'SOL-' || LPAD(num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Supprimer la vue SECURITY DEFINER et la recréer comme vue normale
DROP VIEW IF EXISTS public.drivers_available_for_sharing;

-- Recréer les fonctions RPC avec search_path
CREATE OR REPLACE FUNCTION public.search_available_partners(
  _driver_id UUID,
  _department TEXT DEFAULT NULL,
  _city TEXT DEFAULT NULL,
  _min_rating NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  sharing_number INTEGER,
  formatted_sharing_number TEXT,
  working_sectors TEXT[],
  rating NUMERIC,
  total_rides INTEGER,
  company_name TEXT,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  full_name TEXT,
  profile_photo_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.user_id,
    d.sharing_number,
    public.format_sharing_number(d.sharing_number) as formatted_sharing_number,
    d.working_sectors,
    d.rating,
    d.total_rides,
    d.company_name,
    d.vehicle_brand,
    d.vehicle_model,
    p.full_name,
    p.profile_photo_url
  FROM public.drivers d
  JOIN public.profiles p ON d.user_id = p.id
  WHERE d.sharing_available = true
    AND d.status = 'validated'
    AND d.is_fleet_driver = false
    AND d.fleet_manager_id IS NULL
    AND d.partnerships_suspended = false
    AND d.id != _driver_id
    AND (
      _department IS NULL 
      OR EXISTS (
        SELECT 1 FROM unnest(d.working_sectors) AS sector 
        WHERE sector ILIKE '%' || _department || '%'
      )
    )
    AND (
      _city IS NULL 
      OR EXISTS (
        SELECT 1 FROM unnest(d.working_sectors) AS sector 
        WHERE sector ILIKE '%' || _city || '%'
      )
    )
    AND (_min_rating IS NULL OR d.rating >= _min_rating)
  ORDER BY d.rating DESC NULLS LAST, d.total_rides DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.find_driver_by_sharing_number(_number TEXT)
RETURNS TABLE (
  id UUID,
  sharing_number INTEGER,
  formatted_sharing_number TEXT,
  full_name TEXT,
  company_name TEXT,
  profile_photo_url TEXT,
  rating NUMERIC,
  total_rides INTEGER,
  is_available BOOLEAN
) AS $$
DECLARE
  num_only INTEGER;
BEGIN
  num_only := NULLIF(regexp_replace(_number, '[^0-9]', '', 'g'), '')::INTEGER;
  
  RETURN QUERY
  SELECT 
    d.id,
    d.sharing_number,
    public.format_sharing_number(d.sharing_number) as formatted_sharing_number,
    p.full_name,
    d.company_name,
    p.profile_photo_url,
    d.rating,
    d.total_rides,
    d.sharing_available as is_available
  FROM public.drivers d
  JOIN public.profiles p ON d.user_id = p.id
  WHERE d.sharing_number = num_only
    AND d.status = 'validated'
    AND d.is_fleet_driver = false
    AND d.fleet_manager_id IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;