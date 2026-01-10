
-- 1. CORRECTION: Fonction get_applicable_pricing - Paris = département 75 UNIQUEMENT
-- CDG (95), Orly (94) et banlieue NE SONT PAS Paris

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
  v_temp TEXT;
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
  -- Liste des lieux emblématiques STRICTEMENT dans Paris (75)
  
  IF p_pickup_address IS NOT NULL THEN
    -- EXCLURE les aéroports et banlieue AVANT de chercher Paris
    IF LOWER(p_pickup_address) LIKE '%cdg%' 
       OR LOWER(p_pickup_address) LIKE '%charles de gaulle%'
       OR LOWER(p_pickup_address) LIKE '%roissy%'
       OR LOWER(p_pickup_address) LIKE '%orly%'
       OR LOWER(p_pickup_address) LIKE '%le bourget%'
       OR LOWER(p_pickup_address) LIKE '%beauvais%'
       OR LOWER(p_pickup_address) LIKE '%, 93%'
       OR LOWER(p_pickup_address) LIKE '%, 94%'
       OR LOWER(p_pickup_address) LIKE '%, 95%'
       OR LOWER(p_pickup_address) LIKE '%, 92%'
       OR LOWER(p_pickup_address) LIKE '%, 91%'
       OR LOWER(p_pickup_address) LIKE '%, 77%'
       OR LOWER(p_pickup_address) LIKE '%, 78%'
    THEN
      v_pickup_city := NULL;
    -- Vérifier si c'est VRAIMENT Paris (75)
    ELSIF LOWER(p_pickup_address) LIKE '%, paris%'
       OR LOWER(p_pickup_address) LIKE '%paris, france%'
       OR LOWER(p_pickup_address) LIKE '%paris, île-de-france%'
       OR LOWER(p_pickup_address) LIKE '%, 75%'
       OR LOWER(p_pickup_address) LIKE '%arrondissement%paris%'
       -- Lieux emblématiques strictement dans Paris 75
       OR LOWER(p_pickup_address) LIKE '%tour eiffel%'
       OR LOWER(p_pickup_address) LIKE '%eiffel tower%'
       OR LOWER(p_pickup_address) LIKE '%champs-élysées%'
       OR LOWER(p_pickup_address) LIKE '%champs elysees%'
       OR LOWER(p_pickup_address) LIKE '%arc de triomphe%'
       OR LOWER(p_pickup_address) LIKE '%louvre%'
       OR LOWER(p_pickup_address) LIKE '%notre-dame%'
       OR LOWER(p_pickup_address) LIKE '%sacré-coeur%'
       OR LOWER(p_pickup_address) LIKE '%sacre coeur%'
       OR LOWER(p_pickup_address) LIKE '%montmartre%' 
       OR LOWER(p_pickup_address) LIKE '%opéra garnier%'
       OR LOWER(p_pickup_address) LIKE '%place de la concorde%'
       OR LOWER(p_pickup_address) LIKE '%bastille%'
       OR LOWER(p_pickup_address) LIKE '%marais%'
       OR LOWER(p_pickup_address) LIKE '%quartier latin%'
       OR LOWER(p_pickup_address) LIKE '%saint-germain%'
       OR LOWER(p_pickup_address) LIKE '%trocadéro%'
       OR LOWER(p_pickup_address) LIKE '%invalides%'
       OR LOWER(p_pickup_address) LIKE '%panthéon%'
       OR LOWER(p_pickup_address) LIKE '%gare du nord%'
       OR LOWER(p_pickup_address) LIKE '%gare de lyon%'
       OR LOWER(p_pickup_address) LIKE '%gare montparnasse%'
       OR LOWER(p_pickup_address) LIKE '%gare saint-lazare%'
    THEN
      v_pickup_city := 'Paris';
    END IF;
  END IF;
  
  IF p_destination_address IS NOT NULL THEN
    -- EXCLURE les aéroports et banlieue AVANT de chercher Paris
    IF LOWER(p_destination_address) LIKE '%cdg%' 
       OR LOWER(p_destination_address) LIKE '%charles de gaulle%'
       OR LOWER(p_destination_address) LIKE '%roissy%'
       OR LOWER(p_destination_address) LIKE '%orly%'
       OR LOWER(p_destination_address) LIKE '%le bourget%'
       OR LOWER(p_destination_address) LIKE '%beauvais%'
       OR LOWER(p_destination_address) LIKE '%, 93%'
       OR LOWER(p_destination_address) LIKE '%, 94%'
       OR LOWER(p_destination_address) LIKE '%, 95%'
       OR LOWER(p_destination_address) LIKE '%, 92%'
       OR LOWER(p_destination_address) LIKE '%, 91%'
       OR LOWER(p_destination_address) LIKE '%, 77%'
       OR LOWER(p_destination_address) LIKE '%, 78%'
    THEN
      v_destination_city := NULL;
    -- Vérifier si c'est VRAIMENT Paris (75)
    ELSIF LOWER(p_destination_address) LIKE '%, paris%'
       OR LOWER(p_destination_address) LIKE '%paris, france%'
       OR LOWER(p_destination_address) LIKE '%paris, île-de-france%'
       OR LOWER(p_destination_address) LIKE '%, 75%'
       OR LOWER(p_destination_address) LIKE '%arrondissement%paris%'
       -- Lieux emblématiques strictement dans Paris 75
       OR LOWER(p_destination_address) LIKE '%tour eiffel%'
       OR LOWER(p_destination_address) LIKE '%eiffel tower%'
       OR LOWER(p_destination_address) LIKE '%champs-élysées%'
       OR LOWER(p_destination_address) LIKE '%champs elysees%'
       OR LOWER(p_destination_address) LIKE '%arc de triomphe%'
       OR LOWER(p_destination_address) LIKE '%louvre%'
       OR LOWER(p_destination_address) LIKE '%notre-dame%'
       OR LOWER(p_destination_address) LIKE '%sacré-coeur%'
       OR LOWER(p_destination_address) LIKE '%sacre coeur%'
       OR LOWER(p_destination_address) LIKE '%montmartre%'
       OR LOWER(p_destination_address) LIKE '%opéra garnier%'
       OR LOWER(p_destination_address) LIKE '%place de la concorde%'
       OR LOWER(p_destination_address) LIKE '%bastille%'
       OR LOWER(p_destination_address) LIKE '%marais%'
       OR LOWER(p_destination_address) LIKE '%quartier latin%'
       OR LOWER(p_destination_address) LIKE '%saint-germain%'
       OR LOWER(p_destination_address) LIKE '%trocadéro%'
       OR LOWER(p_destination_address) LIKE '%invalides%'
       OR LOWER(p_destination_address) LIKE '%panthéon%'
       OR LOWER(p_destination_address) LIKE '%gare du nord%'
       OR LOWER(p_destination_address) LIKE '%gare de lyon%'
       OR LOWER(p_destination_address) LIKE '%gare montparnasse%'
       OR LOWER(p_destination_address) LIKE '%gare saint-lazare%'
    THEN
      v_destination_city := 'Paris';
    END IF;
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

-- 2. CORRECTION: Synchroniser le statut de la course quand le devis est accepté

CREATE OR REPLACE FUNCTION public.sync_course_status_on_devis_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand un devis est accepté, mettre la course en "accepted"
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    UPDATE courses 
    SET status = 'accepted', updated_at = NOW()
    WHERE id = NEW.course_id 
      AND status = 'pending';
  END IF;
  
  -- Quand un devis est rejeté, annuler la course
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    UPDATE courses 
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = NEW.course_id 
      AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trg_sync_course_status_on_devis_update ON devis;

-- Créer le nouveau trigger
CREATE TRIGGER trg_sync_course_status_on_devis_update
  AFTER UPDATE OF status ON devis
  FOR EACH ROW
  EXECUTE FUNCTION sync_course_status_on_devis_change();

-- 3. CORRECTION: Mettre à jour les courses existantes avec devis acceptés
UPDATE courses 
SET status = 'accepted', updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT d.course_id 
  FROM devis d 
  WHERE d.status = 'accepted'
)
AND status = 'pending';
