
-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_applicable_pricing(uuid, text, text);

-- REBUILD: detect_paris_address with postal-code-first strict approach
CREATE OR REPLACE FUNCTION public.detect_paris_address(p_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_addr_lower TEXT;
  v_postal TEXT;
  v_has_postal BOOLEAN;
BEGIN
  IF p_address IS NULL OR TRIM(p_address) = '' THEN
    RETURN NULL;
  END IF;
  
  v_addr_lower := LOWER(TRIM(p_address));
  v_postal := substring(p_address from '(\d{5})');
  v_has_postal := v_postal IS NOT NULL;
  
  -- RULE 1: HARD EXCLUDE airports, suburbs, and known non-Paris locations
  IF v_addr_lower LIKE '%cdg%' 
     OR v_addr_lower LIKE '%charles de gaulle%'
     OR v_addr_lower LIKE '%roissy%'
     OR v_addr_lower LIKE '%orly%'
     OR v_addr_lower LIKE '%le bourget%'
     OR v_addr_lower LIKE '%beauvais%'
     OR v_addr_lower LIKE '%disneyland%'
     OR v_addr_lower LIKE '%marne-la-vallée%'
     OR v_addr_lower LIKE '%marne la vallee%'
     OR v_addr_lower LIKE '%la défense%'
     OR v_addr_lower LIKE '%la defense%'
     OR v_addr_lower LIKE '%vincennes%'
     OR v_addr_lower LIKE '%boulogne-billancourt%'
     OR v_addr_lower LIKE '%neuilly-sur-seine%'
     OR v_addr_lower LIKE '%levallois%'
     OR v_addr_lower LIKE '%clichy%'
     OR v_addr_lower LIKE '%saint-denis%'
     OR v_addr_lower LIKE '%saint denis%'
     OR v_addr_lower LIKE '%montreuil%'
     OR v_addr_lower LIKE '%aéroport%'
     OR v_addr_lower LIKE '%aeroport%'
  THEN
    RETURN NULL;
  END IF;
  
  -- RULE 2: If postal code exists, it MUST be 75001-75020 to be Paris
  IF v_has_postal THEN
    IF v_postal ~ '^750(0[1-9]|1[0-9]|20)$' THEN
      RETURN 'Paris';
    END IF;
    RETURN NULL;
  END IF;
  
  -- RULE 3: No postal code — only accept unambiguous Parisian landmarks
  IF v_addr_lower LIKE '%gare du nord%'
     OR v_addr_lower LIKE '%gare de l''est%' OR v_addr_lower LIKE '%gare de l est%'
     OR (v_addr_lower LIKE '%gare de lyon%' AND v_addr_lower NOT LIKE '%perrache%' AND v_addr_lower NOT LIKE '%saint-exup%')
     OR v_addr_lower LIKE '%gare montparnasse%'
     OR v_addr_lower LIKE '%gare saint-lazare%' OR v_addr_lower LIKE '%gare st-lazare%'
     OR v_addr_lower LIKE '%gare d''austerlitz%'
     OR v_addr_lower LIKE '%gare de bercy%'
     OR v_addr_lower LIKE '%tour eiffel%' OR v_addr_lower LIKE '%eiffel tower%'
     OR v_addr_lower LIKE '%arc de triomphe%'
     OR v_addr_lower LIKE '%sacré-coeur%' OR v_addr_lower LIKE '%sacré coeur%' OR v_addr_lower LIKE '%sacre coeur%'
     OR v_addr_lower LIKE '%notre-dame de paris%'
     OR v_addr_lower LIKE '%trocadéro%' OR v_addr_lower LIKE '%trocadero%'
     OR v_addr_lower LIKE '%champs-élysées%' OR v_addr_lower LIKE '%champs élysées%' OR v_addr_lower LIKE '%champs elysees%'
     OR v_addr_lower LIKE '%place de la concorde%'
     OR v_addr_lower LIKE '%place vendôme%' OR v_addr_lower LIKE '%place vendome%'
     OR v_addr_lower LIKE '%place de la bastille%'
     OR v_addr_lower LIKE '%montmartre%'
     OR v_addr_lower LIKE '%moulin rouge%'
     OR v_addr_lower LIKE '%opéra garnier%' OR v_addr_lower LIKE '%opera garnier%'
     OR v_addr_lower LIKE '%louvre%'
     OR v_addr_lower LIKE '%musée d''orsay%' OR v_addr_lower LIKE '%musee d''orsay%'
     OR v_addr_lower LIKE '%centre pompidou%'
     OR v_addr_lower LIKE '%invalides%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- RULE 4: ", Paris" WITHOUT postal code = REJECTED (too ambiguous)
  RETURN NULL;
END;
$$;

-- REBUILD: detect_city_from_address — postal-code-first
CREATE OR REPLACE FUNCTION public.detect_city_from_address(p_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  v_addr_lower TEXT;
  v_paris_result TEXT;
  v_postal TEXT;
  v_has_postal BOOLEAN;
BEGIN
  IF p_address IS NULL OR TRIM(p_address) = '' THEN
    RETURN NULL;
  END IF;
  
  v_addr_lower := LOWER(TRIM(p_address));
  v_postal := substring(p_address from '(\d{5})');
  v_has_postal := v_postal IS NOT NULL;
  
  -- PARIS
  v_paris_result := public.detect_paris_address(p_address);
  IF v_paris_result IS NOT NULL THEN
    RETURN v_paris_result;
  END IF;
  
  -- For all other cities: postal code is authoritative
  -- LYON (69001-69009)
  IF v_has_postal AND v_postal ~ '^6900[1-9]$' THEN RETURN 'Lyon'; END IF;
  IF NOT v_has_postal AND (v_addr_lower LIKE '%place bellecour%' OR v_addr_lower LIKE '%vieux lyon%'
     OR v_addr_lower LIKE '%part-dieu%' OR v_addr_lower LIKE '%fourvière%') THEN RETURN 'Lyon'; END IF;
  
  -- MARSEILLE (13001-13016)
  IF v_has_postal AND v_postal ~ '^130(0[1-9]|1[0-6])$' THEN RETURN 'Marseille'; END IF;
  IF NOT v_has_postal AND (v_addr_lower LIKE '%vieux-port%' OR v_addr_lower LIKE '%canebière%'
     OR v_addr_lower LIKE '%gare saint-charles%') THEN RETURN 'Marseille'; END IF;
  
  -- BORDEAUX (33000, 33100, 33200, 33300, 33800)
  IF v_has_postal AND v_postal IN ('33000','33100','33200','33300','33800') THEN RETURN 'Bordeaux'; END IF;
  
  -- TOULOUSE (31000, 31100, 31300, 31400, 31500)
  IF v_has_postal AND v_postal IN ('31000','31100','31300','31400','31500') THEN RETURN 'Toulouse'; END IF;
  
  -- NICE (06000-06300)
  IF v_has_postal AND v_postal ~ '^06[0-3]00$' THEN RETURN 'Nice'; END IF;
  IF NOT v_has_postal AND (v_addr_lower LIKE '%promenade des anglais%' OR v_addr_lower LIKE '%vieux nice%') THEN RETURN 'Nice'; END IF;
  
  -- NANTES (44000-44300)
  IF v_has_postal AND v_postal ~ '^44[0-3]00$' THEN RETURN 'Nantes'; END IF;
  
  -- STRASBOURG (67000-67200)
  IF v_has_postal AND v_postal ~ '^67[0-2]00$' THEN RETURN 'Strasbourg'; END IF;
  
  -- MONTPELLIER
  IF v_has_postal AND v_postal IN ('34000','34070','34080','34090') THEN RETURN 'Montpellier'; END IF;
  
  -- LILLE (59000, 59800)
  IF v_has_postal AND v_postal IN ('59000','59800') THEN RETURN 'Lille'; END IF;
  
  -- RENNES (35000, 35200, 35700)
  IF v_has_postal AND v_postal IN ('35000','35200','35700') THEN RETURN 'Rennes'; END IF;
  
  RETURN NULL;
END;
$$;

-- REBUILD: get_applicable_pricing — clean, no fallbacks
CREATE OR REPLACE FUNCTION public.get_applicable_pricing(
  p_driver_id UUID,
  p_pickup_address TEXT,
  p_destination_address TEXT
)
RETURNS TABLE (
  pricing_type TEXT,
  city_pricing_id UUID,
  city_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pickup_city TEXT;
  v_destination_city TEXT;
  v_city_pricing RECORD;
BEGIN
  v_pickup_city := public.detect_city_from_address(p_pickup_address);
  v_destination_city := public.detect_city_from_address(p_destination_address);

  -- City pricing ONLY if BOTH addresses are in the SAME city
  IF v_pickup_city IS NOT NULL 
     AND v_destination_city IS NOT NULL
     AND LOWER(TRIM(v_pickup_city)) = LOWER(TRIM(v_destination_city)) THEN

    SELECT * INTO v_city_pricing
    FROM city_pricing cp
    WHERE cp.driver_id = p_driver_id
      AND cp.is_active = true
      AND LOWER(TRIM(cp.city_name)) = LOWER(TRIM(v_pickup_city))
    ORDER BY cp.priority DESC NULLS LAST
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY SELECT
        'city'::TEXT,
        v_city_pricing.id,
        v_city_pricing.city_name;
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT
    'classic'::TEXT,
    NULL::UUID,
    NULL::TEXT;
END;
$$;
