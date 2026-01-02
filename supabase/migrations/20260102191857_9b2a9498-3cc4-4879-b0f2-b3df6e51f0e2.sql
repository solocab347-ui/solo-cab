-- Drop and recreate find_driver_by_sharing_number with user_id
DROP FUNCTION IF EXISTS public.find_driver_by_sharing_number(text);

CREATE OR REPLACE FUNCTION public.find_driver_by_sharing_number(_number text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  sharing_number integer,
  formatted_sharing_number text,
  full_name text,
  profile_photo_url text,
  company_name text,
  rating numeric,
  total_rides integer,
  phone text,
  display_driver_name boolean,
  display_company_name boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _parsed_number integer;
BEGIN
  -- Parse le numéro (accepte SOLO-123456 ou SOL-0001 ou juste 0001 ou 1)
  IF _number ILIKE 'SOLO-%' THEN
    _parsed_number := NULLIF(regexp_replace(substring(_number from 6), '^0+', ''), '')::integer;
  ELSIF _number ILIKE 'SOL-%' THEN
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
    v.user_id,
    v.sharing_number,
    'SOLO-' || LPAD(v.sharing_number::text, 6, '0') as formatted_sharing_number,
    v.full_name,
    v.profile_photo_url,
    v.company_name,
    v.rating,
    v.total_rides,
    v.phone,
    v.display_driver_name,
    v.display_company_name
  FROM drivers_available_for_sharing v
  WHERE v.sharing_number = _parsed_number;
END;
$function$;