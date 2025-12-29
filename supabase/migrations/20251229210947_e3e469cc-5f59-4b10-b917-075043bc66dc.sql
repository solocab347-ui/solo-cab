-- Drop and recreate format_sharing_number function to use SOLO- prefix
DROP FUNCTION IF EXISTS public.format_sharing_number(INTEGER);

CREATE FUNCTION public.format_sharing_number(_number INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 'SOLO-' || LPAD(_number::TEXT, 6, '0');
$$;

-- Update find_driver_by_sharing_number to handle SOLO- prefix
DROP FUNCTION IF EXISTS public.find_driver_by_sharing_number(TEXT);

CREATE FUNCTION public.find_driver_by_sharing_number(_number TEXT)
RETURNS TABLE(
  id UUID,
  sharing_number INTEGER,
  formatted_sharing_number TEXT,
  full_name TEXT,
  company_name TEXT,
  profile_photo_url TEXT,
  rating NUMERIC,
  total_rides INTEGER,
  phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  clean_number TEXT;
  numeric_part INTEGER;
BEGIN
  -- Clean the input: remove SOLO-, SOL-, # and spaces
  clean_number := UPPER(TRIM(_number));
  clean_number := REPLACE(clean_number, 'SOLO-', '');
  clean_number := REPLACE(clean_number, 'SOL-', '');
  clean_number := REPLACE(clean_number, '#', '');
  clean_number := REPLACE(clean_number, ' ', '');
  
  -- Try to convert to integer
  BEGIN
    numeric_part := clean_number::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;
  
  RETURN QUERY
  SELECT 
    d.id,
    d.sharing_number,
    format_sharing_number(d.sharing_number) AS formatted_sharing_number,
    p.full_name,
    d.company_name,
    p.profile_photo_url,
    d.rating,
    d.total_rides,
    CASE WHEN d.show_phone_for_sharing THEN p.phone ELSE NULL END AS phone
  FROM public.drivers d
  JOIN public.profiles p ON d.user_id = p.id
  WHERE d.sharing_number = numeric_part
    AND d.sharing_available = true
    AND d.partnerships_suspended = false
    AND d.status = 'validated';
END;
$$;

-- Update drivers_available_for_sharing view to use SOLO- format
DROP VIEW IF EXISTS public.drivers_available_for_sharing;
CREATE VIEW public.drivers_available_for_sharing AS
SELECT 
  d.id,
  d.user_id,
  d.sharing_number,
  format_sharing_number(d.sharing_number) AS formatted_sharing_number,
  d.working_sectors,
  d.rating,
  d.total_rides,
  d.company_name,
  d.vehicle_brand,
  d.vehicle_model,
  p.full_name,
  p.profile_photo_url,
  CASE WHEN d.show_phone_for_sharing THEN p.phone ELSE NULL END AS phone
FROM public.drivers d
JOIN public.profiles p ON d.user_id = p.id
WHERE d.sharing_available = true
  AND d.partnerships_suspended = false
  AND d.status = 'validated'
  AND d.sharing_number IS NOT NULL;