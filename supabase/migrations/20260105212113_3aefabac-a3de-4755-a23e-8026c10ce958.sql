-- Create is_airport_address function to detect if an address is an airport
CREATE OR REPLACE FUNCTION public.is_airport_address(address text)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF address IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check for common French airport names and codes
  RETURN address ~* '(aéroport|airport|cdg|roissy|orly|beauvais|lyon.*(saint-exupéry|st-exupéry)|marseille.*provence|nice.*côte d''azur|toulouse.*blagnac|bordeaux.*mérignac|nantes.*atlantique|lille.*lesquin|strasbourg|montpellier|bâle-mulhouse)'
      OR address ~* '\b(cdg|ory|bva|lys|mrs|nce|tls|bod|nte|lil|sxb|mpl)\b';
END;
$$;