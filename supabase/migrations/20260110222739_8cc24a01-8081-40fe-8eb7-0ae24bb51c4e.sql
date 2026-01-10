-- Créer la fonction get_applicable_pricing pour déterminer quelle tarification appliquer
CREATE OR REPLACE FUNCTION get_applicable_pricing(
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
  -- Extraire la ville depuis l'adresse de pickup (dernier segment avant code postal ou fin)
  v_pickup_city := NULL;
  v_destination_city := NULL;
  
  -- Essayer d'extraire la ville de l'adresse de pickup (format français typique)
  -- Pattern: recherche un mot de 3+ lettres avant un code postal (5 chiffres)
  IF p_pickup_address IS NOT NULL THEN
    -- Extraire tout ce qui est après le dernier numéro et avant le code postal
    SELECT TRIM(REGEXP_REPLACE(
      REGEXP_REPLACE(p_pickup_address, '.*,\s*', '', 'g'),  -- Tout après la dernière virgule
      '\s*\d{5}\s*.*$', '', 'g'  -- Enlever code postal et ce qui suit
    )) INTO v_pickup_city;
    
    -- Si ça n'a pas marché, essayer autre chose
    IF v_pickup_city IS NULL OR LENGTH(v_pickup_city) < 2 THEN
      -- Prendre les derniers mots avant les chiffres
      SELECT TRIM((REGEXP_MATCHES(p_pickup_address, '([A-Za-zÀ-ÿ\-\s]+)\s*\d{5}', 'i'))[1]) INTO v_pickup_city;
    END IF;
  END IF;
  
  IF p_destination_address IS NOT NULL THEN
    SELECT TRIM(REGEXP_REPLACE(
      REGEXP_REPLACE(p_destination_address, '.*,\s*', '', 'g'),
      '\s*\d{5}\s*.*$', '', 'g'
    )) INTO v_destination_city;
    
    IF v_destination_city IS NULL OR LENGTH(v_destination_city) < 2 THEN
      SELECT TRIM((REGEXP_MATCHES(p_destination_address, '([A-Za-zÀ-ÿ\-\s]+)\s*\d{5}', 'i'))[1]) INTO v_destination_city;
    END IF;
  END IF;
  
  -- Debug logging (optionnel)
  RAISE NOTICE 'Parsed cities: pickup=%, destination=%', v_pickup_city, v_destination_city;
  
  -- Vérifier si les deux villes sont identiques et qu'une tarification ville existe
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