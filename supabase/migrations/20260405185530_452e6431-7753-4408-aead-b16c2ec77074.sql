
CREATE OR REPLACE FUNCTION public.get_applicable_pricing(
  p_driver_id UUID,
  p_pickup_address TEXT DEFAULT NULL,
  p_destination_address TEXT DEFAULT NULL
)
RETURNS TABLE(pricing_type TEXT, city_pricing_id UUID, city_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pickup_city TEXT;
  v_destination_city TEXT;
  v_city_pricing RECORD;
BEGIN
  v_pickup_city := NULL;
  v_destination_city := NULL;

  -- MÉTHODE 1: Utiliser la détection intelligente (avec exclusions aéroports/banlieue)
  IF p_pickup_address IS NOT NULL THEN
    v_pickup_city := public.detect_city_from_address(p_pickup_address);
  END IF;

  IF p_destination_address IS NOT NULL THEN
    v_destination_city := public.detect_city_from_address(p_destination_address);
  END IF;

  -- Vérifier si les deux villes sont identiques ET qu'une tarification ville existe
  IF v_pickup_city IS NOT NULL AND v_destination_city IS NOT NULL
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

  -- Par défaut, tarification classique
  RETURN QUERY SELECT
    'classic'::TEXT,
    NULL::UUID,
    NULL::TEXT;
END;
$$;
