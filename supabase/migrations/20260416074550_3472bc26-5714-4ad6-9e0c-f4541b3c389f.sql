
-- Fix detect_paris_address: include 75116 (16th arrondissement IS Paris intra-muros)
CREATE OR REPLACE FUNCTION public.detect_paris_address(p_address text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
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
  
  -- RULE 2: Postal code present → MUST be Paris intra-muros
  -- 75001-75020 (standard arrondissements) + 75116 (16th arr. uses this code)
  IF v_has_postal THEN
    IF v_postal ~ '^750(0[1-9]|1[0-9]|20)$' OR v_postal = '75116' THEN
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
  
  RETURN NULL;
END;
$function$;

-- Fix detect_city_from_address: add 75116 support + 20+ new French cities
CREATE OR REPLACE FUNCTION public.detect_city_from_address(p_address text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
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
  
  -- PARIS (handled by dedicated function, includes 75116)
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
  IF NOT v_has_postal AND (v_addr_lower LIKE '%place de la bourse%' AND v_addr_lower LIKE '%bordeaux%') THEN RETURN 'Bordeaux'; END IF;
  
  -- TOULOUSE (31000, 31100, 31200, 31300, 31400, 31500)
  IF v_has_postal AND v_postal IN ('31000','31100','31200','31300','31400','31500') THEN RETURN 'Toulouse'; END IF;
  IF NOT v_has_postal AND (v_addr_lower LIKE '%place du capitole%' OR v_addr_lower LIKE '%capitole de toulouse%') THEN RETURN 'Toulouse'; END IF;
  
  -- NICE (06000, 06100, 06200, 06300)
  IF v_has_postal AND v_postal ~ '^06[0-3]00$' THEN RETURN 'Nice'; END IF;
  IF NOT v_has_postal AND (v_addr_lower LIKE '%promenade des anglais%' OR v_addr_lower LIKE '%vieux nice%') THEN RETURN 'Nice'; END IF;
  
  -- NANTES (44000, 44100, 44200, 44300)
  IF v_has_postal AND v_postal ~ '^44[0-3]00$' THEN RETURN 'Nantes'; END IF;
  IF NOT v_has_postal AND (v_addr_lower LIKE '%château des ducs%' AND v_addr_lower LIKE '%nantes%') THEN RETURN 'Nantes'; END IF;
  
  -- STRASBOURG (67000, 67100, 67200)
  IF v_has_postal AND v_postal ~ '^67[0-2]00$' THEN RETURN 'Strasbourg'; END IF;
  IF NOT v_has_postal AND (v_addr_lower LIKE '%petite france%' AND v_addr_lower LIKE '%strasbourg%') THEN RETURN 'Strasbourg'; END IF;
  
  -- MONTPELLIER (34000, 34070, 34080, 34090)
  IF v_has_postal AND v_postal IN ('34000','34070','34080','34090') THEN RETURN 'Montpellier'; END IF;
  IF NOT v_has_postal AND (v_addr_lower LIKE '%place de la comédie%' OR v_addr_lower LIKE '%place de la comedie%') THEN RETURN 'Montpellier'; END IF;
  
  -- LILLE (59000, 59800)
  IF v_has_postal AND v_postal IN ('59000','59800') THEN RETURN 'Lille'; END IF;
  IF NOT v_has_postal AND (v_addr_lower LIKE '%grand place%' AND v_addr_lower LIKE '%lille%') THEN RETURN 'Lille'; END IF;
  
  -- RENNES (35000, 35200, 35700)
  IF v_has_postal AND v_postal IN ('35000','35200','35700') THEN RETURN 'Rennes'; END IF;
  
  -- ============ NOUVELLES VILLES ============
  
  -- ORLÉANS (45000, 45100)
  IF v_has_postal AND v_postal IN ('45000','45100') THEN RETURN 'Orléans'; END IF;
  IF NOT v_has_postal AND (v_addr_lower LIKE '%place du martroi%' OR (v_addr_lower LIKE '%cathédrale%' AND v_addr_lower LIKE '%orléans%')) THEN RETURN 'Orléans'; END IF;
  
  -- GRENOBLE (38000, 38100)
  IF v_has_postal AND v_postal IN ('38000','38100') THEN RETURN 'Grenoble'; END IF;
  
  -- TOULON (83000, 83100, 83200)
  IF v_has_postal AND v_postal IN ('83000','83100','83200') THEN RETURN 'Toulon'; END IF;
  
  -- DIJON (21000, 21100)
  IF v_has_postal AND v_postal IN ('21000','21100') THEN RETURN 'Dijon'; END IF;
  
  -- ANGERS (49000, 49100)
  IF v_has_postal AND v_postal IN ('49000','49100') THEN RETURN 'Angers'; END IF;
  
  -- LE MANS (72000, 72100)
  IF v_has_postal AND v_postal IN ('72000','72100') THEN RETURN 'Le Mans'; END IF;
  
  -- REIMS (51100, 51000)
  IF v_has_postal AND v_postal IN ('51100','51000') THEN RETURN 'Reims'; END IF;
  
  -- SAINT-ÉTIENNE (42000, 42100)
  IF v_has_postal AND v_postal IN ('42000','42100') THEN RETURN 'Saint-Étienne'; END IF;
  
  -- LE HAVRE (76600, 76610, 76620)
  IF v_has_postal AND v_postal IN ('76600','76610','76620') THEN RETURN 'Le Havre'; END IF;
  
  -- CLERMONT-FERRAND (63000, 63100)
  IF v_has_postal AND v_postal IN ('63000','63100') THEN RETURN 'Clermont-Ferrand'; END IF;
  
  -- TOURS (37000, 37100, 37200)
  IF v_has_postal AND v_postal IN ('37000','37100','37200') THEN RETURN 'Tours'; END IF;
  
  -- AMIENS (80000, 80080, 80090)
  IF v_has_postal AND v_postal IN ('80000','80080','80090') THEN RETURN 'Amiens'; END IF;
  
  -- LIMOGES (87000, 87100)
  IF v_has_postal AND v_postal IN ('87000','87100') THEN RETURN 'Limoges'; END IF;
  
  -- METZ (57000, 57050, 57070)
  IF v_has_postal AND v_postal IN ('57000','57050','57070') THEN RETURN 'Metz'; END IF;
  
  -- BESANÇON (25000, 25030)
  IF v_has_postal AND v_postal IN ('25000','25030') THEN RETURN 'Besançon'; END IF;
  
  -- PERPIGNAN (66000, 66100)
  IF v_has_postal AND v_postal IN ('66000','66100') THEN RETURN 'Perpignan'; END IF;
  
  -- ROUEN (76000, 76100)
  IF v_has_postal AND v_postal IN ('76000','76100') THEN RETURN 'Rouen'; END IF;
  
  -- CAEN (14000)
  IF v_has_postal AND v_postal = '14000' THEN RETURN 'Caen'; END IF;
  
  -- NANCY (54000, 54100)
  IF v_has_postal AND v_postal IN ('54000','54100') THEN RETURN 'Nancy'; END IF;
  
  -- BREST (29200)
  IF v_has_postal AND v_postal = '29200' THEN RETURN 'Brest'; END IF;
  
  -- POITIERS (86000)
  IF v_has_postal AND v_postal = '86000' THEN RETURN 'Poitiers'; END IF;
  
  -- PAU (64000)
  IF v_has_postal AND v_postal = '64000' THEN RETURN 'Pau'; END IF;
  
  -- AIX-EN-PROVENCE (13080, 13090, 13100, 13290, 13540)
  IF v_has_postal AND v_postal IN ('13080','13090','13100','13290','13540') THEN RETURN 'Aix-en-Provence'; END IF;
  
  -- VILLEURBANNE (69100)
  IF v_has_postal AND v_postal = '69100' THEN RETURN 'Villeurbanne'; END IF;
  
  -- MULHOUSE (68100, 68200)
  IF v_has_postal AND v_postal IN ('68100','68200') THEN RETURN 'Mulhouse'; END IF;
  
  -- AVIGNON (84000)
  IF v_has_postal AND v_postal = '84000' THEN RETURN 'Avignon'; END IF;
  
  -- CANNES (06400)
  IF v_has_postal AND v_postal = '06400' THEN RETURN 'Cannes'; END IF;
  
  RETURN NULL;
END;
$function$;
