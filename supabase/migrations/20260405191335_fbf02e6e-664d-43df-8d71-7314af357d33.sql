
CREATE OR REPLACE FUNCTION public.detect_paris_address(p_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_addr_lower TEXT;
  v_postal TEXT;
BEGIN
  IF p_address IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_addr_lower := LOWER(p_address);
  v_postal := substring(p_address from '(\d{5})');
  
  -- 1. EXCLURE aéroports et banlieue
  IF v_addr_lower LIKE '%cdg%' 
     OR v_addr_lower LIKE '%charles de gaulle%'
     OR v_addr_lower LIKE '%roissy%'
     OR v_addr_lower LIKE '%orly%'
     OR v_addr_lower LIKE '%le bourget%'
     OR v_addr_lower LIKE '%beauvais%'
     OR v_addr_lower LIKE '%disneyland%'
     OR v_addr_lower LIKE '%marne-la-vallée%'
     OR v_addr_lower LIKE '%la défense%'
  THEN
    RETURN NULL;
  END IF;
  
  -- Exclure départements banlieue par code postal strict
  IF v_postal IS NOT NULL AND NOT (v_postal ~ '^750[0-2][0-9]$') THEN
    -- Si le code postal n'est pas parisien (75001-75020), vérifier si c'est banlieue
    IF v_postal ~ '^(91|92|93|94|95|77|78)\d{3}$' THEN
      RETURN NULL;
    END IF;
  END IF;
  
  -- 2. Vérifier via code postal strict (75001-75020)
  IF v_postal IS NOT NULL AND v_postal ~ '^750(0[1-9]|1[0-9]|20)$' THEN
    RETURN 'Paris';
  END IF;
  
  -- 3. Mention explicite ", Paris" avec code postal parisien ou absent
  IF v_addr_lower LIKE '%, paris%' OR v_addr_lower LIKE '%paris, france%' OR v_addr_lower LIKE '%paris, île-de-france%' THEN
    -- Si un code postal est présent, il doit être parisien
    IF v_postal IS NULL OR v_postal ~ '^750(0[1-9]|1[0-9]|20)$' THEN
      RETURN 'Paris';
    END IF;
    RETURN NULL;
  END IF;
  
  -- 4. Musées de Paris (lieux uniques, pas ambigus)
  IF v_addr_lower LIKE '%louvre%'
     OR v_addr_lower LIKE '%musée d''orsay%' OR v_addr_lower LIKE '%musee d''orsay%'
     OR v_addr_lower LIKE '%centre pompidou%' OR v_addr_lower LIKE '%beaubourg%'
     OR v_addr_lower LIKE '%musée rodin%'
     OR v_addr_lower LIKE '%musée de l''orangerie%'
     OR v_addr_lower LIKE '%musée picasso%'
     OR v_addr_lower LIKE '%musée du quai branly%' OR v_addr_lower LIKE '%quai branly%'
     OR v_addr_lower LIKE '%musée grévin%' OR v_addr_lower LIKE '%grevin%'
     OR v_addr_lower LIKE '%palais de tokyo%'
     OR v_addr_lower LIKE '%petit palais%' OR v_addr_lower LIKE '%grand palais%'
     OR v_addr_lower LIKE '%fondation louis vuitton%'
     OR v_addr_lower LIKE '%cité des sciences%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- 5. Monuments emblématiques
  IF v_addr_lower LIKE '%tour eiffel%' OR v_addr_lower LIKE '%eiffel tower%'
     OR v_addr_lower LIKE '%arc de triomphe%'
     OR v_addr_lower LIKE '%sacré-coeur%' OR v_addr_lower LIKE '%sacré coeur%' OR v_addr_lower LIKE '%sacre coeur%'
     OR v_addr_lower LIKE '%notre-dame de paris%'
     OR v_addr_lower LIKE '%panthéon%' AND v_addr_lower LIKE '%paris%'
     OR v_addr_lower LIKE '%invalides%'
     OR v_addr_lower LIKE '%trocadéro%' OR v_addr_lower LIKE '%trocadero%'
     OR v_addr_lower LIKE '%champs-élysées%' OR v_addr_lower LIKE '%champs élysées%' OR v_addr_lower LIKE '%champs elysees%'
     OR v_addr_lower LIKE '%place de la concorde%'
     OR v_addr_lower LIKE '%place vendôme%' OR v_addr_lower LIKE '%place vendome%'
     OR v_addr_lower LIKE '%place de la bastille%'
     OR v_addr_lower LIKE '%place de la république%'
     OR v_addr_lower LIKE '%place de la nation%'
     OR v_addr_lower LIKE '%montmartre%'
     OR v_addr_lower LIKE '%pigalle%'
     OR v_addr_lower LIKE '%moulin rouge%'
     OR v_addr_lower LIKE '%opéra garnier%' OR v_addr_lower LIKE '%opera garnier%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- 6. Gares parisiennes
  IF v_addr_lower LIKE '%gare du nord%'
     OR v_addr_lower LIKE '%gare de l''est%' OR v_addr_lower LIKE '%gare de l est%'
     OR v_addr_lower LIKE '%gare de lyon%' AND v_addr_lower NOT LIKE '%perrache%'
     OR v_addr_lower LIKE '%gare montparnasse%'
     OR v_addr_lower LIKE '%gare saint-lazare%' OR v_addr_lower LIKE '%gare st-lazare%'
     OR v_addr_lower LIKE '%gare d''austerlitz%'
     OR v_addr_lower LIKE '%gare de bercy%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- 7. Quartiers parisiens
  IF v_addr_lower LIKE '%le marais%' AND (v_addr_lower LIKE '%paris%' OR v_postal IS NULL OR v_postal ~ '^750')
     OR v_addr_lower LIKE '%saint-germain-des-prés%'
     OR v_addr_lower LIKE '%quartier latin%'
     OR v_addr_lower LIKE '%belleville%' AND v_addr_lower LIKE '%paris%'
     OR v_addr_lower LIKE '%ménilmontant%'
     OR v_addr_lower LIKE '%batignolles%'
  THEN
    RETURN 'Paris';
  END IF;
  
  RETURN NULL;
END;
$$;
