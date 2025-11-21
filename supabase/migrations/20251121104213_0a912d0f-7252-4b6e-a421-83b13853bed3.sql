-- Fix generate_quote_number function to use REV- prefix for quotes instead of RES-
CREATE OR REPLACE FUNCTION public.generate_quote_number(_driver_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _counter INTEGER;
  _quote_number TEXT;
BEGIN
  -- Increment counter
  UPDATE public.drivers
  SET quote_counter = quote_counter + 1
  WHERE id = _driver_id
  RETURNING quote_counter INTO _counter;
  
  -- Generate quote number with REV- prefix (REV-001, REV-002, etc.)
  _quote_number := 'REV-' || LPAD(_counter::TEXT, 3, '0');
  
  RETURN _quote_number;
END;
$function$;