
CREATE OR REPLACE FUNCTION public.detect_city_from_address(p_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_addr_lower TEXT;
  v_paris_result TEXT;
  v_postal TEXT;
BEGIN
  IF p_address IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_addr_lower := LOWER(TRIM(p_address));
  
  -- Extraire le code postal (5 chiffres) de l'adresse
  v_postal := substring(p_address from '(\d{5})');
  
  -- ===== PARIS (via detect_paris_address, déjà corrigé) =====
  v_paris_result := public.detect_paris_address(p_address);
  IF v_paris_result IS NOT NULL THEN
    RETURN v_paris_result;
  END IF;
  
  -- ===== LYON (69001-69009 uniquement, PAS 69100+ banlieue) =====
  IF v_postal IS NOT NULL AND v_postal ~ '^6900[1-9]$' THEN
    RETURN 'Lyon';
  END IF;
  IF v_addr_lower LIKE '%, lyon%' AND v_addr_lower NOT LIKE '%saint%lyon%' THEN
    IF v_postal IS NULL OR v_postal ~ '^6900[1-9]$' THEN
      RETURN 'Lyon';
    END IF;
  END IF;
  IF v_addr_lower LIKE '%place bellecour%'
     OR v_addr_lower LIKE '%vieux lyon%'
     OR (v_addr_lower LIKE '%fourviere%' OR v_addr_lower LIKE '%fourvière%')
     OR v_addr_lower LIKE '%part-dieu%'
     OR v_addr_lower LIKE '%gare de lyon-perrache%'
     OR v_addr_lower LIKE '%gare de la part-dieu%'
  THEN
    RETURN 'Lyon';
  END IF;
  
  -- ===== MARSEILLE (13001-13016 uniquement, PAS 13100+ Aix etc) =====
  IF v_postal IS NOT NULL AND v_postal ~ '^130(0[1-9]|1[0-6])$' THEN
    RETURN 'Marseille';
  END IF;
  IF v_addr_lower LIKE '%, marseille%' THEN
    IF v_postal IS NULL OR v_postal ~ '^130(0[1-9]|1[0-6])$' THEN
      RETURN 'Marseille';
    END IF;
  END IF;
  IF v_addr_lower LIKE '%vieux-port%'
     OR v_addr_lower LIKE '%canebière%'
     OR v_addr_lower LIKE '%notre-dame de la garde%'
     OR v_addr_lower LIKE '%mucem%'
     OR (v_addr_lower LIKE '%velodrome%' AND v_addr_lower LIKE '%marseille%')
     OR v_addr_lower LIKE '%gare saint-charles%'
  THEN
    RETURN 'Marseille';
  END IF;
  
  -- ===== BORDEAUX (33000, 33100, 33200, 33300, 33800 = Bordeaux commune) =====
  IF v_postal IS NOT NULL AND v_postal IN ('33000', '33100', '33200', '33300', '33800') THEN
    RETURN 'Bordeaux';
  END IF;
  IF v_addr_lower LIKE '%, bordeaux%' OR v_addr_lower LIKE '%bordeaux, france%' THEN
    IF v_postal IS NULL OR v_postal IN ('33000', '33100', '33200', '33300', '33800') THEN
      RETURN 'Bordeaux';
    END IF;
  END IF;
  IF (v_addr_lower LIKE '%place de la bourse%' AND v_addr_lower LIKE '%bordeaux%')
     OR v_addr_lower LIKE '%cité du vin%'
     OR (v_addr_lower LIKE '%quinconces%' AND v_addr_lower LIKE '%bordeaux%')
     OR (v_addr_lower LIKE '%gare saint-jean%' AND v_addr_lower LIKE '%bordeaux%')
  THEN
    RETURN 'Bordeaux';
  END IF;
  
  -- ===== TOULOUSE (31000, 31100, 31200, 31300, 31400, 31500 = Toulouse commune) =====
  IF v_postal IS NOT NULL AND v_postal ~ '^31[0-5]00$' THEN
    RETURN 'Toulouse';
  END IF;
  IF v_addr_lower LIKE '%, toulouse%' OR v_addr_lower LIKE '%toulouse, france%' THEN
    IF v_postal IS NULL OR v_postal ~ '^31[0-5]00$' THEN
      RETURN 'Toulouse';
    END IF;
  END IF;
  IF v_addr_lower LIKE '%place du capitole%'
     OR (v_addr_lower LIKE '%capitole%' AND v_addr_lower LIKE '%toulouse%')
     OR v_addr_lower LIKE '%basilique saint-sernin%'
  THEN
    RETURN 'Toulouse';
  END IF;
  
  -- ===== NICE (06000, 06100, 06200, 06300 = Nice commune) =====
  IF v_postal IS NOT NULL AND v_postal ~ '^06[0-3]00$' THEN
    RETURN 'Nice';
  END IF;
  IF v_addr_lower LIKE '%, nice%' OR v_addr_lower LIKE '%nice, france%' THEN
    IF v_postal IS NULL OR v_postal ~ '^06[0-3]00$' THEN
      RETURN 'Nice';
    END IF;
  END IF;
  IF v_addr_lower LIKE '%promenade des anglais%'
     OR v_addr_lower LIKE '%vieux nice%'
     OR v_addr_lower LIKE '%place masséna%' OR v_addr_lower LIKE '%place massena%'
  THEN
    RETURN 'Nice';
  END IF;
  
  -- ===== NANTES (44000, 44100, 44200, 44300) =====
  IF v_postal IS NOT NULL AND v_postal ~ '^44[0-3]00$' THEN
    RETURN 'Nantes';
  END IF;
  IF v_addr_lower LIKE '%, nantes%' OR v_addr_lower LIKE '%nantes, france%' THEN
    IF v_postal IS NULL OR v_postal ~ '^44[0-3]00$' THEN
      RETURN 'Nantes';
    END IF;
  END IF;
  
  -- ===== STRASBOURG (67000, 67100, 67200) =====
  IF v_postal IS NOT NULL AND v_postal ~ '^67[0-2]00$' THEN
    RETURN 'Strasbourg';
  END IF;
  IF v_addr_lower LIKE '%, strasbourg%' OR v_addr_lower LIKE '%strasbourg, france%' THEN
    IF v_postal IS NULL OR v_postal ~ '^67[0-2]00$' THEN
      RETURN 'Strasbourg';
    END IF;
  END IF;
  
  -- ===== MONTPELLIER (34000, 34070, 34080, 34090) =====
  IF v_postal IS NOT NULL AND v_postal IN ('34000', '34070', '34080', '34090') THEN
    RETURN 'Montpellier';
  END IF;
  IF v_addr_lower LIKE '%, montpellier%' OR v_addr_lower LIKE '%montpellier, france%' THEN
    IF v_postal IS NULL OR v_postal IN ('34000', '34070', '34080', '34090') THEN
      RETURN 'Montpellier';
    END IF;
  END IF;
  
  -- ===== LILLE (59000, 59800) =====
  IF v_postal IS NOT NULL AND v_postal IN ('59000', '59800') THEN
    RETURN 'Lille';
  END IF;
  IF v_addr_lower LIKE '%, lille%' OR v_addr_lower LIKE '%lille, france%' THEN
    IF v_postal IS NULL OR v_postal IN ('59000', '59800') THEN
      RETURN 'Lille';
    END IF;
  END IF;
  
  -- ===== RENNES (35000, 35200, 35700) =====
  IF v_postal IS NOT NULL AND v_postal IN ('35000', '35200', '35700') THEN
    RETURN 'Rennes';
  END IF;
  IF v_addr_lower LIKE '%, rennes%' OR v_addr_lower LIKE '%rennes, france%' THEN
    IF v_postal IS NULL OR v_postal IN ('35000', '35200', '35700') THEN
      RETURN 'Rennes';
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;
