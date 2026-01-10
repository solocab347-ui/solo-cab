
-- ==============================================
-- CORRECTIONS: 
-- 1. Rating par défaut à 5/5 pour tous les nouveaux chauffeurs
-- 2. Exclure les partenaires existants de la recherche
-- ==============================================

-- 1. Modifier la valeur par défaut du rating à 5.0
ALTER TABLE public.drivers 
ALTER COLUMN rating SET DEFAULT 5.0;

-- 2. Mettre à jour les chauffeurs existants qui ont 0 à 5.0
UPDATE public.drivers 
SET rating = 5.0 
WHERE rating = 0 OR rating IS NULL;

-- 3. Supprimer et recréer la fonction find_driver_by_sharing_number
DROP FUNCTION IF EXISTS public.find_driver_by_sharing_number(TEXT);

CREATE FUNCTION public.find_driver_by_sharing_number(_number TEXT)
RETURNS TABLE (
  id UUID,
  sharing_number INTEGER,
  formatted_sharing_number TEXT,
  rating NUMERIC,
  total_rides INTEGER,
  company_name TEXT,
  full_name TEXT,
  profile_photo_url TEXT,
  phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  numeric_part INTEGER;
BEGIN
  -- Nettoyer et extraire la partie numérique
  numeric_part := NULLIF(regexp_replace(_number, '[^0-9]', '', 'g'), '')::INTEGER;
  
  IF numeric_part IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    d.id,
    d.sharing_number,
    'SOLO-' || LPAD(d.sharing_number::text, 6, '0') as formatted_sharing_number,
    d.rating,
    d.total_rides,
    d.company_name,
    p.full_name,
    p.profile_photo_url,
    CASE WHEN d.show_phone_for_sharing THEN p.phone ELSE NULL END AS phone
  FROM drivers d
  JOIN profiles p ON d.user_id = p.id
  WHERE d.sharing_number = numeric_part
    AND d.visible_to_drivers = true
    AND d.partnerships_suspended IS NOT TRUE
    AND (
      -- Chauffeur validé
      d.status = 'validated'
      -- OU Pionnier avec essai actif
      OR (d.is_pioneer = true AND d.free_access_end_date > NOW())
      -- OU Nouveau chauffeur en période de grâce
      OR (d.created_at > NOW() - INTERVAL '30 days' AND d.status IN ('pending', 'validated'))
    );
END;
$$;

-- 4. Mettre à jour search_available_partners pour EXCLURE les partenaires existants
CREATE OR REPLACE FUNCTION public.search_available_partners(
  _driver_id UUID,
  _department TEXT DEFAULT NULL,
  _city TEXT DEFAULT NULL,
  _min_rating NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  sharing_number INTEGER,
  formatted_sharing_number TEXT,
  working_sectors TEXT[],
  rating NUMERIC,
  total_rides INTEGER,
  company_name TEXT,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  full_name TEXT,
  profile_photo_url TEXT,
  phone TEXT,
  email TEXT,
  display_driver_name BOOLEAN,
  display_company_name BOOLEAN,
  show_phone BOOLEAN,
  show_email BOOLEAN,
  show_rating_partners BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.user_id,
    v.sharing_number,
    'SOLO-' || LPAD(v.sharing_number::text, 6, '0') as formatted_sharing_number,
    v.working_sectors,
    v.rating,
    v.total_rides,
    v.company_name,
    v.vehicle_brand,
    v.vehicle_model,
    v.full_name,
    v.profile_photo_url,
    v.phone,
    v.email,
    v.display_driver_name,
    v.display_company_name,
    v.show_phone_for_sharing AS show_phone,
    v.show_email,
    COALESCE(v.show_rating_partners, false) AS show_rating_partners
  FROM drivers_available_for_sharing v
  WHERE v.id != _driver_id
    -- EXCLURE les chauffeurs avec qui un partenariat existe déjà (actif, pending, suspended)
    AND NOT EXISTS (
      SELECT 1 FROM driver_partnerships dp
      WHERE (
        (dp.driver_a_id = _driver_id AND dp.driver_b_id = v.id)
        OR (dp.driver_a_id = v.id AND dp.driver_b_id = _driver_id)
      )
      AND dp.status IN ('active', 'pending', 'suspended')
    )
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

-- 5. Créer un trigger pour s'assurer que les nouveaux chauffeurs ont toujours rating = 5
CREATE OR REPLACE FUNCTION set_default_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le rating n'est pas défini ou est 0, le mettre à 5
  IF NEW.rating IS NULL OR NEW.rating = 0 THEN
    NEW.rating := 5.0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_default_driver_rating ON drivers;
CREATE TRIGGER trigger_set_default_driver_rating
BEFORE INSERT ON drivers
FOR EACH ROW
EXECUTE FUNCTION set_default_driver_rating();

-- 6. Créer un index pour optimiser la recherche d'exclusion des partenaires
CREATE INDEX IF NOT EXISTS idx_driver_partnerships_lookup 
ON driver_partnerships (driver_a_id, driver_b_id, status);

-- Permissions
GRANT EXECUTE ON FUNCTION public.search_available_partners(UUID, TEXT, TEXT, NUMERIC) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_driver_by_sharing_number(TEXT) TO anon, authenticated;
