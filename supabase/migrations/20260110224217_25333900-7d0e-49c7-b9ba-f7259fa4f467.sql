
-- CORRECTION: Fonction get_applicable_pricing - Ajouter plus de lieux parisiens connus
-- Hôpitaux, universités, gares, et lieux emblématiques du 75

CREATE OR REPLACE FUNCTION public.get_applicable_pricing(
  p_driver_id uuid, 
  p_pickup_address text, 
  p_destination_address text
)
RETURNS TABLE(pricing_type text, city_pricing_id uuid, city_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pickup_city TEXT;
  v_destination_city TEXT;
  v_city_pricing RECORD;
BEGIN
  v_pickup_city := NULL;
  v_destination_city := NULL;
  
  -- MÉTHODE 1: Recherche directe parmi les villes configurées
  FOR v_city_pricing IN
    SELECT cp.city_name, cp.id
    FROM city_pricing cp
    WHERE cp.driver_id = p_driver_id
      AND cp.is_active = true
    ORDER BY LENGTH(cp.city_name) DESC
  LOOP
    IF p_pickup_address IS NOT NULL 
       AND LOWER(p_pickup_address) LIKE '%' || LOWER(v_city_pricing.city_name) || '%' THEN
      v_pickup_city := v_city_pricing.city_name;
    END IF;
    
    IF p_destination_address IS NOT NULL 
       AND LOWER(p_destination_address) LIKE '%' || LOWER(v_city_pricing.city_name) || '%' THEN
      v_destination_city := v_city_pricing.city_name;
    END IF;
    
    IF v_pickup_city = v_destination_city AND v_pickup_city IS NOT NULL THEN
      RETURN QUERY SELECT 
        'city'::TEXT,
        v_city_pricing.id,
        v_city_pricing.city_name;
      RETURN;
    END IF;
  END LOOP;
  
  -- MÉTHODE 2: Détection intelligente de Paris (75 uniquement)
  -- Fonction helper inline pour détecter si une adresse est dans Paris 75
  
  IF p_pickup_address IS NOT NULL THEN
    v_pickup_city := public.detect_paris_address(p_pickup_address);
  END IF;
  
  IF p_destination_address IS NOT NULL THEN
    v_destination_city := public.detect_paris_address(p_destination_address);
  END IF;
  
  -- Vérifier si les deux villes sont identiques
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
$function$;

-- Fonction helper pour détecter si une adresse est dans Paris (75)
CREATE OR REPLACE FUNCTION public.detect_paris_address(p_address text)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_addr_lower TEXT;
BEGIN
  IF p_address IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_addr_lower := LOWER(p_address);
  
  -- 1. EXCLURE d'abord les aéroports et banlieue (pas dans Paris 75)
  IF v_addr_lower LIKE '%cdg%' 
     OR v_addr_lower LIKE '%charles de gaulle%'
     OR v_addr_lower LIKE '%roissy%'
     OR v_addr_lower LIKE '%orly%'
     OR v_addr_lower LIKE '%le bourget%'
     OR v_addr_lower LIKE '%beauvais%'
     -- Départements hors Paris
     OR v_addr_lower LIKE '%, 93%'
     OR v_addr_lower LIKE '%, 94%'
     OR v_addr_lower LIKE '%, 95%'
     OR v_addr_lower LIKE '%, 92%'
     OR v_addr_lower LIKE '%, 91%'
     OR v_addr_lower LIKE '%, 77%'
     OR v_addr_lower LIKE '%, 78%'
     OR v_addr_lower LIKE '%seine-saint-denis%'
     OR v_addr_lower LIKE '%val-de-marne%'
     OR v_addr_lower LIKE '%hauts-de-seine%'
     OR v_addr_lower LIKE '%essonne%'
     OR v_addr_lower LIKE '%yvelines%'
     OR v_addr_lower LIKE '%seine-et-marne%'
  THEN
    RETURN NULL;
  END IF;
  
  -- 2. Vérifier si c'est VRAIMENT Paris (75)
  -- Codes postaux Paris (750XX)
  IF v_addr_lower LIKE '%750%'
     OR v_addr_lower LIKE '%, 75%'
     OR v_addr_lower LIKE '%75001%' OR v_addr_lower LIKE '%75002%' OR v_addr_lower LIKE '%75003%'
     OR v_addr_lower LIKE '%75004%' OR v_addr_lower LIKE '%75005%' OR v_addr_lower LIKE '%75006%'
     OR v_addr_lower LIKE '%75007%' OR v_addr_lower LIKE '%75008%' OR v_addr_lower LIKE '%75009%'
     OR v_addr_lower LIKE '%75010%' OR v_addr_lower LIKE '%75011%' OR v_addr_lower LIKE '%75012%'
     OR v_addr_lower LIKE '%75013%' OR v_addr_lower LIKE '%75014%' OR v_addr_lower LIKE '%75015%'
     OR v_addr_lower LIKE '%75016%' OR v_addr_lower LIKE '%75017%' OR v_addr_lower LIKE '%75018%'
     OR v_addr_lower LIKE '%75019%' OR v_addr_lower LIKE '%75020%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- Mentions explicites de Paris
  IF v_addr_lower LIKE '%, paris%'
     OR v_addr_lower LIKE '%paris, france%'
     OR v_addr_lower LIKE '%paris, île-de-france%'
     OR v_addr_lower LIKE '%arrondissement%paris%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- MONUMENTS ET LIEUX EMBLÉMATIQUES (Paris 75)
  IF v_addr_lower LIKE '%tour eiffel%'
     OR v_addr_lower LIKE '%eiffel tower%'
     OR v_addr_lower LIKE '%champs-élysées%'
     OR v_addr_lower LIKE '%champs elysees%'
     OR v_addr_lower LIKE '%arc de triomphe%'
     OR v_addr_lower LIKE '%louvre%'
     OR v_addr_lower LIKE '%notre-dame%'
     OR v_addr_lower LIKE '%sacré-coeur%'
     OR v_addr_lower LIKE '%sacré coeur%'
     OR v_addr_lower LIKE '%montmartre%'
     OR v_addr_lower LIKE '%opéra garnier%'
     OR v_addr_lower LIKE '%place de la concorde%'
     OR v_addr_lower LIKE '%bastille%'
     OR v_addr_lower LIKE '%marais%'
     OR v_addr_lower LIKE '%quartier latin%'
     OR v_addr_lower LIKE '%saint-germain%'
     OR v_addr_lower LIKE '%trocadéro%'
     OR v_addr_lower LIKE '%invalides%'
     OR v_addr_lower LIKE '%panthéon%'
     OR v_addr_lower LIKE '%place vendôme%'
     OR v_addr_lower LIKE '%place vendome%'
     OR v_addr_lower LIKE '%palais royal%'
     OR v_addr_lower LIKE '%jardin du luxembourg%'
     OR v_addr_lower LIKE '%jardin des tuileries%'
     OR v_addr_lower LIKE '%champ de mars%'
     OR v_addr_lower LIKE '%musée d''orsay%'
     OR v_addr_lower LIKE '%centre pompidou%'
     OR v_addr_lower LIKE '%beaubourg%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- GARES PARISIENNES
  IF v_addr_lower LIKE '%gare du nord%'
     OR v_addr_lower LIKE '%gare de lyon%'
     OR v_addr_lower LIKE '%gare montparnasse%'
     OR v_addr_lower LIKE '%gare de l''est%'
     OR v_addr_lower LIKE '%gare saint-lazare%'
     OR v_addr_lower LIKE '%gare d''austerlitz%'
     OR v_addr_lower LIKE '%gare de bercy%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- HÔPITAUX PARISIENS (dans le 75)
  IF v_addr_lower LIKE '%pitié-salpêtrière%'
     OR v_addr_lower LIKE '%pitie-salpetriere%'
     OR v_addr_lower LIKE '%pitié salpêtrière%'
     OR v_addr_lower LIKE '%hôtel-dieu%'
     OR v_addr_lower LIKE '%hôpital cochin%'
     OR v_addr_lower LIKE '%hôpital necker%'
     OR v_addr_lower LIKE '%hôpital lariboisière%'
     OR v_addr_lower LIKE '%hôpital tenon%'
     OR v_addr_lower LIKE '%hôpital saint-louis%'
     OR v_addr_lower LIKE '%hôpital saint-antoine%'
     OR v_addr_lower LIKE '%hôpital européen georges-pompidou%'
     OR v_addr_lower LIKE '%hegp%'
     OR v_addr_lower LIKE '%hôpital bichat%'
     OR v_addr_lower LIKE '%hôpital beaujon%'
     OR v_addr_lower LIKE '%hôpital bretonneau%'
     OR v_addr_lower LIKE '%val-de-grâce%'
     OR v_addr_lower LIKE '%hôpital trousseau%'
     OR v_addr_lower LIKE '%hôpital robert-debré%'
     OR v_addr_lower LIKE '%hôpital rothschild%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- UNIVERSITÉS ET GRANDES ÉCOLES (Paris 75)
  IF v_addr_lower LIKE '%sorbonne%'
     OR v_addr_lower LIKE '%sciences po%'
     OR v_addr_lower LIKE '%université paris%'
     OR v_addr_lower LIKE '%école normale supérieure%'
     OR v_addr_lower LIKE '%école des mines%'
     OR v_addr_lower LIKE '%école polytechnique%'
     OR v_addr_lower LIKE '%dauphine%'
     OR v_addr_lower LIKE '%assas%'
     OR v_addr_lower LIKE '%jussieu%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- QUARTIERS ET PLACES CÉLÈBRES
  IF v_addr_lower LIKE '%châtelet%'
     OR v_addr_lower LIKE '%les halles%'
     OR v_addr_lower LIKE '%place de la république%'
     OR v_addr_lower LIKE '%place de la nation%'
     OR v_addr_lower LIKE '%place d''italie%'
     OR v_addr_lower LIKE '%oberkampf%'
     OR v_addr_lower LIKE '%belleville%'
     OR v_addr_lower LIKE '%ménilmontant%'
     OR v_addr_lower LIKE '%batignolles%'
     OR v_addr_lower LIKE '%pigalle%'
     OR v_addr_lower LIKE '%moulin rouge%'
     OR v_addr_lower LIKE '%opéra%' AND v_addr_lower LIKE '%paris%'
     OR v_addr_lower LIKE '%grands boulevards%'
     OR v_addr_lower LIKE '%madeleine%'
     OR v_addr_lower LIKE '%étoile%'
     OR v_addr_lower LIKE '%bir-hakeim%'
  THEN
    RETURN 'Paris';
  END IF;
  
  RETURN NULL;
END;
$$;
