-- Améliorer la fonction get_applicable_pricing pour mieux détecter les villes
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
  v_temp TEXT;
BEGIN
  v_pickup_city := NULL;
  v_destination_city := NULL;
  
  -- AMÉLIORATION: Extraction de ville plus robuste
  -- Chercher parmi les villes configurées dans city_pricing
  
  -- Méthode 1: Recherche directe dans les adresses parmi les villes configurées
  FOR v_city_pricing IN
    SELECT cp.city_name, cp.id
    FROM city_pricing cp
    WHERE cp.driver_id = p_driver_id
      AND cp.is_active = true
    ORDER BY LENGTH(cp.city_name) DESC -- Les noms les plus longs d'abord
  LOOP
    -- Vérifier si la ville est présente dans l'adresse de pickup (insensible à la casse)
    IF p_pickup_address IS NOT NULL 
       AND LOWER(p_pickup_address) LIKE '%' || LOWER(v_city_pricing.city_name) || '%' THEN
      v_pickup_city := v_city_pricing.city_name;
    END IF;
    
    -- Vérifier si la ville est présente dans l'adresse de destination
    IF p_destination_address IS NOT NULL 
       AND LOWER(p_destination_address) LIKE '%' || LOWER(v_city_pricing.city_name) || '%' THEN
      v_destination_city := v_city_pricing.city_name;
    END IF;
    
    -- Si les deux correspondent à la même ville configurée, on a trouvé!
    IF v_pickup_city = v_destination_city AND v_pickup_city IS NOT NULL THEN
      RETURN QUERY SELECT 
        'city'::TEXT,
        v_city_pricing.id,
        v_city_pricing.city_name;
      RETURN;
    END IF;
  END LOOP;
  
  -- Méthode 2: Fallback - extraction classique si pas de correspondance directe
  IF p_pickup_address IS NOT NULL THEN
    -- Chercher "Paris" spécifiquement (cas fréquent)
    IF LOWER(p_pickup_address) LIKE '%paris%' THEN
      v_pickup_city := 'Paris';
    ELSE
      -- Extraire la partie ville après la dernière virgule avant le code postal
      SELECT TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(p_pickup_address, '.*,\s*', '', 'g'),
        '\s*\d{5}\s*.*$', '', 'g'
      )) INTO v_temp;
      
      IF v_temp IS NOT NULL AND LENGTH(v_temp) >= 2 THEN
        v_pickup_city := v_temp;
      END IF;
    END IF;
  END IF;
  
  IF p_destination_address IS NOT NULL THEN
    -- Chercher "Paris" spécifiquement dans la destination
    IF LOWER(p_destination_address) LIKE '%paris%' THEN
      v_destination_city := 'Paris';
    -- Tour Eiffel = Paris !
    ELSIF LOWER(p_destination_address) LIKE '%tour eiffel%' 
       OR LOWER(p_destination_address) LIKE '%eiffel tower%' THEN
      v_destination_city := 'Paris';
    -- Aéroport CDG = proche Paris
    ELSIF LOWER(p_destination_address) LIKE '%cdg%' 
       OR LOWER(p_destination_address) LIKE '%charles de gaulle%' THEN
      v_destination_city := 'Paris';
    -- Aéroport Orly = proche Paris
    ELSIF LOWER(p_destination_address) LIKE '%orly%' THEN
      v_destination_city := 'Paris';
    ELSE
      SELECT TRIM(REGEXP_REPLACE(
        REGEXP_REPLACE(p_destination_address, '.*,\s*', '', 'g'),
        '\s*\d{5}\s*.*$', '', 'g'
      )) INTO v_temp;
      
      IF v_temp IS NOT NULL AND LENGTH(v_temp) >= 2 THEN
        v_destination_city := v_temp;
      END IF;
    END IF;
  END IF;
  
  -- Vérifier si les deux villes sont identiques
  IF v_pickup_city IS NOT NULL AND v_destination_city IS NOT NULL 
     AND LOWER(TRIM(v_pickup_city)) = LOWER(TRIM(v_destination_city)) THEN
    
    -- Chercher une tarification par ville active pour ce chauffeur
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
  
  -- Par défaut, retourner tarification classique
  RETURN QUERY SELECT 
    'classic'::TEXT,
    NULL::UUID,
    NULL::TEXT;
END;
$$;