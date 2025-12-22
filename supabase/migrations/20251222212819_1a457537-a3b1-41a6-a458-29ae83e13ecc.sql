-- Add show_phone_for_sharing column to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS show_phone_for_sharing boolean DEFAULT false;

-- Update the drivers_available_for_sharing view to include phone
DROP VIEW IF EXISTS public.drivers_available_for_sharing;

CREATE VIEW public.drivers_available_for_sharing AS
SELECT 
  d.id,
  d.user_id,
  d.sharing_number,
  d.working_sectors,
  d.rating,
  d.total_rides,
  d.company_name,
  d.vehicle_brand,
  d.vehicle_model,
  d.show_phone_for_sharing,
  p.full_name,
  p.profile_photo_url,
  CASE WHEN d.show_phone_for_sharing = true THEN p.phone ELSE NULL END as phone
FROM drivers d
JOIN profiles p ON d.user_id = p.id
WHERE d.sharing_available = true
  AND d.is_fleet_driver IS NOT TRUE
  AND d.fleet_manager_id IS NULL
  AND d.status = 'validated';

-- Drop and recreate the search function to include phone
DROP FUNCTION IF EXISTS public.search_available_partners(_driver_id uuid, _department text, _city text, _min_rating numeric);

CREATE OR REPLACE FUNCTION public.search_available_partners(
  _driver_id uuid,
  _department text DEFAULT NULL,
  _city text DEFAULT NULL,
  _min_rating numeric DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  sharing_number integer,
  formatted_sharing_number text,
  working_sectors text[],
  rating numeric,
  total_rides integer,
  company_name text,
  vehicle_brand text,
  vehicle_model text,
  full_name text,
  profile_photo_url text,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.user_id,
    v.sharing_number,
    'SOL-' || LPAD(v.sharing_number::text, 4, '0') as formatted_sharing_number,
    v.working_sectors,
    v.rating,
    v.total_rides,
    v.company_name,
    v.vehicle_brand,
    v.vehicle_model,
    v.full_name,
    v.profile_photo_url,
    v.phone
  FROM drivers_available_for_sharing v
  WHERE v.id != _driver_id
    AND (_min_rating IS NULL OR v.rating >= _min_rating)
    AND (
      _department IS NULL 
      OR EXISTS (
        SELECT 1 FROM unnest(v.working_sectors) AS sector 
        WHERE sector ILIKE '%' || _department || '%'
      )
    )
    AND (
      _city IS NULL 
      OR EXISTS (
        SELECT 1 FROM unnest(v.working_sectors) AS sector 
        WHERE sector ILIKE '%' || _city || '%'
      )
    )
  ORDER BY v.rating DESC NULLS LAST, v.total_rides DESC NULLS LAST;
END;
$$;

-- Update find_driver_by_sharing_number to include phone
DROP FUNCTION IF EXISTS public.find_driver_by_sharing_number(_number text);

CREATE OR REPLACE FUNCTION public.find_driver_by_sharing_number(_number text)
RETURNS TABLE(
  id uuid,
  sharing_number integer,
  formatted_sharing_number text,
  full_name text,
  profile_photo_url text,
  company_name text,
  rating numeric,
  total_rides integer,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _parsed_number integer;
BEGIN
  -- Parse le numéro (accepte SOL-0001 ou juste 0001 ou 1)
  IF _number ILIKE 'SOL-%' THEN
    _parsed_number := NULLIF(regexp_replace(substring(_number from 5), '^0+', ''), '')::integer;
  ELSE
    _parsed_number := NULLIF(regexp_replace(_number, '^0+', ''), '')::integer;
  END IF;

  IF _parsed_number IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    v.id,
    v.sharing_number,
    'SOL-' || LPAD(v.sharing_number::text, 4, '0') as formatted_sharing_number,
    v.full_name,
    v.profile_photo_url,
    v.company_name,
    v.rating,
    v.total_rides,
    v.phone
  FROM drivers_available_for_sharing v
  WHERE v.sharing_number = _parsed_number;
END;
$$;