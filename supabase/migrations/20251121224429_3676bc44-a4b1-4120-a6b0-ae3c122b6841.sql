-- Drop old function
DROP FUNCTION IF EXISTS public.generate_quote_number(uuid);

-- Create improved quote number generation function that handles existing quotes
CREATE OR REPLACE FUNCTION public.generate_quote_number(_driver_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _next_number INTEGER;
  _quote_number TEXT;
BEGIN
  -- Find the highest existing quote number for this driver
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN quote_number ~ '^REV-[0-9]+$' 
        THEN CAST(SUBSTRING(quote_number FROM 5) AS INTEGER)
        ELSE 0
      END
    ), 
    0
  ) + 1
  INTO _next_number
  FROM public.devis
  WHERE driver_id = _driver_id;
  
  -- Update the driver's counter to match
  UPDATE public.drivers
  SET quote_counter = _next_number
  WHERE id = _driver_id;
  
  -- Generate the quote number
  _quote_number := 'REV-' || LPAD(_next_number::TEXT, 3, '0');
  
  RETURN _quote_number;
END;
$$;

-- Create similar function for course numbers
DROP FUNCTION IF EXISTS public.generate_course_number(uuid);

CREATE OR REPLACE FUNCTION public.generate_course_number(_driver_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _next_number INTEGER;
  _course_number TEXT;
BEGIN
  -- Find the highest existing course number for this driver
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN course_number ~ '^DEV-[0-9]+$' 
        THEN CAST(SUBSTRING(course_number FROM 5) AS INTEGER)
        ELSE 0
      END
    ), 
    0
  ) + 1
  INTO _next_number
  FROM public.courses
  WHERE driver_id = _driver_id;
  
  -- Update the driver's counter to match
  UPDATE public.drivers
  SET course_counter = _next_number
  WHERE id = _driver_id;
  
  -- Generate the course number
  _course_number := 'DEV-' || LPAD(_next_number::TEXT, 3, '0');
  
  RETURN _course_number;
END;
$$;

-- Create similar function for invoice numbers
DROP FUNCTION IF EXISTS public.generate_invoice_number(uuid);

CREATE OR REPLACE FUNCTION public.generate_invoice_number(_driver_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _next_number INTEGER;
  _invoice_number TEXT;
BEGIN
  -- Find the highest existing invoice number for this driver
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN invoice_number ~ '^FAC-[0-9]+$' 
        THEN CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)
        ELSE 0
      END
    ), 
    0
  ) + 1
  INTO _next_number
  FROM public.factures
  WHERE driver_id = _driver_id;
  
  -- Update the driver's counter to match
  UPDATE public.drivers
  SET invoice_counter = _next_number
  WHERE id = _driver_id;
  
  -- Generate the invoice number
  _invoice_number := 'FAC-' || LPAD(_next_number::TEXT, 3, '0');
  
  RETURN _invoice_number;
END;
$$;