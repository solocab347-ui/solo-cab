
-- Enrichir detect_paris_address avec TOUS les musées, monuments, théâtres
-- Et ajouter les fonctions de détection pour les autres grandes villes françaises

CREATE OR REPLACE FUNCTION public.detect_paris_address(p_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
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
  
  -- 2. Vérifier si c'est VRAIMENT Paris (75) via codes postaux
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
  
  -- ===== MUSÉES DE PARIS =====
  IF v_addr_lower LIKE '%louvre%'
     OR v_addr_lower LIKE '%musée d''orsay%'
     OR v_addr_lower LIKE '%musee d''orsay%'
     OR v_addr_lower LIKE '%orsay%'
     OR v_addr_lower LIKE '%centre pompidou%'
     OR v_addr_lower LIKE '%beaubourg%'
     OR v_addr_lower LIKE '%musée rodin%'
     OR v_addr_lower LIKE '%musée de l''orangerie%'
     OR v_addr_lower LIKE '%orangerie%'
     OR v_addr_lower LIKE '%musée picasso%'
     OR v_addr_lower LIKE '%musée de cluny%'
     OR v_addr_lower LIKE '%musée du quai branly%'
     OR v_addr_lower LIKE '%quai branly%'
     OR v_addr_lower LIKE '%musée grévin%'
     OR v_addr_lower LIKE '%grevin%'
     OR v_addr_lower LIKE '%musée marmottan%'
     OR v_addr_lower LIKE '%musée carnavalet%'
     OR v_addr_lower LIKE '%musée guimet%'
     OR v_addr_lower LIKE '%musée de l''armée%'
     OR v_addr_lower LIKE '%musée de la chasse%'
     OR v_addr_lower LIKE '%musée de la marine%'
     OR v_addr_lower LIKE '%musée des arts décoratifs%'
     OR v_addr_lower LIKE '%musée d''art moderne%'
     OR v_addr_lower LIKE '%palais de tokyo%'
     OR v_addr_lower LIKE '%petit palais%'
     OR v_addr_lower LIKE '%grand palais%'
     OR v_addr_lower LIKE '%musée jacquemart-andré%'
     OR v_addr_lower LIKE '%musée cognacq-jay%'
     OR v_addr_lower LIKE '%musée zadkine%'
     OR v_addr_lower LIKE '%musée bourdelle%'
     OR v_addr_lower LIKE '%musée de la vie romantique%'
     OR v_addr_lower LIKE '%musée gustave moreau%'
     OR v_addr_lower LIKE '%musée nissim de camondo%'
     OR v_addr_lower LIKE '%cité des sciences%'
     OR v_addr_lower LIKE '%géode%'
     OR v_addr_lower LIKE '%musée de l''homme%'
     OR v_addr_lower LIKE '%musée national d''histoire naturelle%'
     OR v_addr_lower LIKE '%muséum%'
     OR v_addr_lower LIKE '%palais de la découverte%'
     OR v_addr_lower LIKE '%fondation louis vuitton%'
     OR v_addr_lower LIKE '%bourse de commerce%'
     OR v_addr_lower LIKE '%collection pinault%'
     OR v_addr_lower LIKE '%musée yves saint laurent%'
     OR v_addr_lower LIKE '%musée galliera%'
     OR v_addr_lower LIKE '%musée de montmartre%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- ===== MONUMENTS ET LIEUX EMBLÉMATIQUES =====
  IF v_addr_lower LIKE '%tour eiffel%'
     OR v_addr_lower LIKE '%eiffel tower%'
     OR v_addr_lower LIKE '%champs-élysées%'
     OR v_addr_lower LIKE '%champs elysees%'
     OR v_addr_lower LIKE '%arc de triomphe%'
     OR v_addr_lower LIKE '%notre-dame%'
     OR v_addr_lower LIKE '%sacré-coeur%'
     OR v_addr_lower LIKE '%sacré coeur%'
     OR v_addr_lower LIKE '%sacre coeur%'
     OR v_addr_lower LIKE '%montmartre%'
     OR v_addr_lower LIKE '%opéra garnier%'
     OR v_addr_lower LIKE '%opera garnier%'
     OR v_addr_lower LIKE '%palais garnier%'
     OR v_addr_lower LIKE '%place de la concorde%'
     OR v_addr_lower LIKE '%bastille%'
     OR v_addr_lower LIKE '%marais%'
     OR v_addr_lower LIKE '%quartier latin%'
     OR v_addr_lower LIKE '%saint-germain%'
     OR v_addr_lower LIKE '%saint germain des prés%'
     OR v_addr_lower LIKE '%trocadéro%'
     OR v_addr_lower LIKE '%trocadero%'
     OR v_addr_lower LIKE '%invalides%'
     OR v_addr_lower LIKE '%panthéon%'
     OR v_addr_lower LIKE '%pantheon%'
     OR v_addr_lower LIKE '%place vendôme%'
     OR v_addr_lower LIKE '%place vendome%'
     OR v_addr_lower LIKE '%palais royal%'
     OR v_addr_lower LIKE '%jardin du luxembourg%'
     OR v_addr_lower LIKE '%jardin des tuileries%'
     OR v_addr_lower LIKE '%champ de mars%'
     OR v_addr_lower LIKE '%conciergerie%'
     OR v_addr_lower LIKE '%sainte-chapelle%'
     OR v_addr_lower LIKE '%île de la cité%'
     OR v_addr_lower LIKE '%île saint-louis%'
     OR v_addr_lower LIKE '%pont neuf%'
     OR v_addr_lower LIKE '%pont alexandre%'
     OR v_addr_lower LIKE '%colonnes de buren%'
     OR v_addr_lower LIKE '%obélisque%'
     OR v_addr_lower LIKE '%arènes de lutèce%'
     OR v_addr_lower LIKE '%catacombes%'
     OR v_addr_lower LIKE '%père lachaise%'
     OR v_addr_lower LIKE '%père-lachaise%'
     OR v_addr_lower LIKE '%cimetière du montparnasse%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- ===== THÉÂTRES ET SALLES DE SPECTACLE =====
  IF v_addr_lower LIKE '%opéra bastille%'
     OR v_addr_lower LIKE '%opera bastille%'
     OR v_addr_lower LIKE '%comédie française%'
     OR v_addr_lower LIKE '%comedie francaise%'
     OR v_addr_lower LIKE '%théâtre du châtelet%'
     OR v_addr_lower LIKE '%théâtre de la ville%'
     OR v_addr_lower LIKE '%théâtre mogador%'
     OR v_addr_lower LIKE '%théâtre des champs%'
     OR v_addr_lower LIKE '%odéon%'
     OR v_addr_lower LIKE '%olympia%'
     OR v_addr_lower LIKE '%casino de paris%'
     OR v_addr_lower LIKE '%moulin rouge%'
     OR v_addr_lower LIKE '%lido%'
     OR v_addr_lower LIKE '%crazy horse%'
     OR v_addr_lower LIKE '%folies bergère%'
     OR v_addr_lower LIKE '%salle pleyel%'
     OR v_addr_lower LIKE '%philharmonie%'
     OR v_addr_lower LIKE '%maison de la radio%'
     OR v_addr_lower LIKE '%radio france%'
     OR v_addr_lower LIKE '%accorhotels arena%'
     OR v_addr_lower LIKE '%bercy arena%'
     OR v_addr_lower LIKE '%accor arena%'
     OR v_addr_lower LIKE '%zénith%'
     OR v_addr_lower LIKE '%zenith%'
     OR v_addr_lower LIKE '%bataclan%'
     OR v_addr_lower LIKE '%élysée montmartre%'
     OR v_addr_lower LIKE '%la cigale%'
     OR v_addr_lower LIKE '%rex club%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- ===== GARES PARISIENNES =====
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
  
  -- ===== HÔPITAUX PARISIENS (dans le 75) =====
  IF v_addr_lower LIKE '%pitié-salpêtrière%'
     OR v_addr_lower LIKE '%pitie-salpetriere%'
     OR v_addr_lower LIKE '%pitié salpêtrière%'
     OR v_addr_lower LIKE '%salpetriere%'
     OR v_addr_lower LIKE '%hôtel-dieu%'
     OR v_addr_lower LIKE '%hotel-dieu%'
     OR v_addr_lower LIKE '%hôpital cochin%'
     OR v_addr_lower LIKE '%hopital cochin%'
     OR v_addr_lower LIKE '%hôpital necker%'
     OR v_addr_lower LIKE '%hopital necker%'
     OR v_addr_lower LIKE '%hôpital lariboisière%'
     OR v_addr_lower LIKE '%hopital lariboisiere%'
     OR v_addr_lower LIKE '%lariboisiere%'
     OR v_addr_lower LIKE '%hôpital tenon%'
     OR v_addr_lower LIKE '%hopital tenon%'
     OR v_addr_lower LIKE '%hôpital saint-louis%'
     OR v_addr_lower LIKE '%hopital saint-louis%'
     OR v_addr_lower LIKE '%hôpital saint-antoine%'
     OR v_addr_lower LIKE '%hopital saint-antoine%'
     OR v_addr_lower LIKE '%hôpital européen georges-pompidou%'
     OR v_addr_lower LIKE '%hegp%'
     OR v_addr_lower LIKE '%hôpital bichat%'
     OR v_addr_lower LIKE '%hopital bichat%'
     OR v_addr_lower LIKE '%hôpital beaujon%'
     OR v_addr_lower LIKE '%hopital beaujon%'
     OR v_addr_lower LIKE '%hôpital bretonneau%'
     OR v_addr_lower LIKE '%hopital bretonneau%'
     OR v_addr_lower LIKE '%val-de-grâce%'
     OR v_addr_lower LIKE '%val de grace%'
     OR v_addr_lower LIKE '%hôpital trousseau%'
     OR v_addr_lower LIKE '%hopital trousseau%'
     OR v_addr_lower LIKE '%hôpital robert-debré%'
     OR v_addr_lower LIKE '%hopital robert-debre%'
     OR v_addr_lower LIKE '%hôpital rothschild%'
     OR v_addr_lower LIKE '%hopital rothschild%'
     OR v_addr_lower LIKE '%hôpital broca%'
     OR v_addr_lower LIKE '%hopital broca%'
     OR v_addr_lower LIKE '%hôpital fernand-widal%'
     OR v_addr_lower LIKE '%hôpital sainte-anne%'
     OR v_addr_lower LIKE '%hopital sainte-anne%'
     OR v_addr_lower LIKE '%hôpital la salpêtrière%'
     OR v_addr_lower LIKE '%hôpital vaugirard%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- ===== UNIVERSITÉS ET GRANDES ÉCOLES (Paris 75) =====
  IF v_addr_lower LIKE '%sorbonne%'
     OR v_addr_lower LIKE '%sciences po%'
     OR v_addr_lower LIKE '%université paris%'
     OR v_addr_lower LIKE '%universite paris%'
     OR v_addr_lower LIKE '%école normale supérieure%'
     OR v_addr_lower LIKE '%ecole normale superieure%'
     OR v_addr_lower LIKE '%ens paris%'
     OR v_addr_lower LIKE '%école des mines%'
     OR v_addr_lower LIKE '%mines paristech%'
     OR v_addr_lower LIKE '%dauphine%'
     OR v_addr_lower LIKE '%assas%'
     OR v_addr_lower LIKE '%jussieu%'
     OR v_addr_lower LIKE '%collège de france%'
     OR v_addr_lower LIKE '%college de france%'
     OR v_addr_lower LIKE '%école du louvre%'
     OR v_addr_lower LIKE '%ensad%'
     OR v_addr_lower LIKE '%école des beaux-arts%'
     OR v_addr_lower LIKE '%conservatoire%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- ===== QUARTIERS ET PLACES CÉLÈBRES =====
  IF v_addr_lower LIKE '%châtelet%'
     OR v_addr_lower LIKE '%chatelet%'
     OR v_addr_lower LIKE '%les halles%'
     OR v_addr_lower LIKE '%place de la république%'
     OR v_addr_lower LIKE '%place de la republique%'
     OR v_addr_lower LIKE '%place de la nation%'
     OR v_addr_lower LIKE '%place d''italie%'
     OR v_addr_lower LIKE '%oberkampf%'
     OR v_addr_lower LIKE '%belleville%'
     OR v_addr_lower LIKE '%ménilmontant%'
     OR v_addr_lower LIKE '%menilmontant%'
     OR v_addr_lower LIKE '%batignolles%'
     OR v_addr_lower LIKE '%pigalle%'
     OR v_addr_lower LIKE '%grands boulevards%'
     OR v_addr_lower LIKE '%madeleine%'
     OR v_addr_lower LIKE '%étoile%'
     OR v_addr_lower LIKE '%bir-hakeim%'
     OR v_addr_lower LIKE '%bir hakeim%'
     OR v_addr_lower LIKE '%passy%'
     OR v_addr_lower LIKE '%auteuil%'
     OR v_addr_lower LIKE '%la villette%'
     OR v_addr_lower LIKE '%buttes chaumont%'
     OR v_addr_lower LIKE '%bois de vincennes%'
     OR v_addr_lower LIKE '%bois de boulogne%'
     OR v_addr_lower LIKE '%bercy village%'
     OR v_addr_lower LIKE '%bibliothèque nationale%'
     OR v_addr_lower LIKE '%bnf%'
     OR v_addr_lower LIKE '%françois mitterrand%'
     OR v_addr_lower LIKE '%denfert-rochereau%'
     OR v_addr_lower LIKE '%alésia%'
     OR v_addr_lower LIKE '%montparnasse%'
  THEN
    RETURN 'Paris';
  END IF;
  
  -- ===== CENTRES COMMERCIAUX ET LIEUX PARISIENS =====
  IF v_addr_lower LIKE '%forum des halles%'
     OR v_addr_lower LIKE '%galeries lafayette%'
     OR v_addr_lower LIKE '%printemps haussmann%'
     OR v_addr_lower LIKE '%bon marché%'
     OR v_addr_lower LIKE '%samaritaine%'
     OR v_addr_lower LIKE '%bhv%'
     OR v_addr_lower LIKE '%la défense%' AND NOT v_addr_lower LIKE '%92%'
  THEN
    RETURN 'Paris';
  END IF;
  
  RETURN NULL;
END;
$$;

-- ===== FONCTION GÉNÉRIQUE POUR DÉTECTER LES VILLES =====
CREATE OR REPLACE FUNCTION public.detect_city_from_address(p_address TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_addr_lower TEXT;
  v_paris_result TEXT;
BEGIN
  IF p_address IS NULL THEN
    RETURN NULL;
  END IF;
  
  v_addr_lower := LOWER(p_address);
  
  -- Vérifier Paris en premier
  v_paris_result := public.detect_paris_address(p_address);
  IF v_paris_result IS NOT NULL THEN
    RETURN v_paris_result;
  END IF;
  
  -- ===== LYON =====
  IF v_addr_lower LIKE '%, lyon%'
     OR v_addr_lower LIKE '%lyon, france%'
     OR v_addr_lower LIKE '%690%'
     OR v_addr_lower LIKE '%, 69%'
     -- Monuments Lyon
     OR v_addr_lower LIKE '%basilique de fourvière%'
     OR v_addr_lower LIKE '%fourviere%'
     OR v_addr_lower LIKE '%place bellecour%'
     OR v_addr_lower LIKE '%vieux lyon%'
     OR v_addr_lower LIKE '%presqu''île%'
     OR v_addr_lower LIKE '%part-dieu%'
     OR v_addr_lower LIKE '%confluence%'
     OR v_addr_lower LIKE '%théâtre des célestins%'
     OR v_addr_lower LIKE '%opéra de lyon%'
     OR v_addr_lower LIKE '%musée des beaux-arts lyon%'
     OR v_addr_lower LIKE '%musée des confluences%'
     OR v_addr_lower LIKE '%institut lumière%'
     -- Gares Lyon
     OR v_addr_lower LIKE '%gare de lyon-perrache%'
     OR v_addr_lower LIKE '%gare de la part-dieu%'
     -- Hôpitaux Lyon
     OR v_addr_lower LIKE '%hôpital edouard herriot%'
     OR v_addr_lower LIKE '%hcl lyon%'
     OR v_addr_lower LIKE '%hôpital de la croix-rousse%'
     OR v_addr_lower LIKE '%hôpital lyon sud%'
  THEN
    RETURN 'Lyon';
  END IF;
  
  -- ===== MARSEILLE =====
  IF v_addr_lower LIKE '%, marseille%'
     OR v_addr_lower LIKE '%marseille, france%'
     OR v_addr_lower LIKE '%130%'
     OR v_addr_lower LIKE '%, 13%'
     -- Monuments Marseille
     OR v_addr_lower LIKE '%notre-dame de la garde%'
     OR v_addr_lower LIKE '%bonne mère%'
     OR v_addr_lower LIKE '%vieux-port%'
     OR v_addr_lower LIKE '%mucem%'
     OR v_addr_lower LIKE '%fort saint-jean%'
     OR v_addr_lower LIKE '%palais du pharo%'
     OR v_addr_lower LIKE '%canebière%'
     OR v_addr_lower LIKE '%panier%'
     OR v_addr_lower LIKE '%calanques%'
     OR v_addr_lower LIKE '%stade vélodrome%'
     OR v_addr_lower LIKE '%velodrome%'
     -- Gares Marseille
     OR v_addr_lower LIKE '%gare saint-charles%'
     -- Hôpitaux Marseille
     OR v_addr_lower LIKE '%hôpital de la timone%'
     OR v_addr_lower LIKE '%timone%'
     OR v_addr_lower LIKE '%ap-hm%'
     OR v_addr_lower LIKE '%hôpital nord marseille%'
     OR v_addr_lower LIKE '%hôpital de la conception%'
  THEN
    RETURN 'Marseille';
  END IF;
  
  -- ===== BORDEAUX =====
  IF v_addr_lower LIKE '%, bordeaux%'
     OR v_addr_lower LIKE '%bordeaux, france%'
     OR v_addr_lower LIKE '%330%'
     OR v_addr_lower LIKE '%, 33%'
     -- Monuments Bordeaux
     OR v_addr_lower LIKE '%place de la bourse%'
     OR v_addr_lower LIKE '%miroir d''eau%'
     OR v_addr_lower LIKE '%grand théâtre%' AND v_addr_lower LIKE '%bordeaux%'
     OR v_addr_lower LIKE '%cité du vin%'
     OR v_addr_lower LIKE '%saint-émilion%'
     OR v_addr_lower LIKE '%darwin%' AND v_addr_lower LIKE '%bordeaux%'
     OR v_addr_lower LIKE '%quinconces%'
     OR v_addr_lower LIKE '%rue sainte-catherine%' AND v_addr_lower LIKE '%bordeaux%'
     -- Gares Bordeaux
     OR v_addr_lower LIKE '%gare saint-jean%' AND v_addr_lower LIKE '%bordeaux%'
     -- Hôpitaux Bordeaux
     OR v_addr_lower LIKE '%chu bordeaux%'
     OR v_addr_lower LIKE '%hôpital pellegrin%'
     OR v_addr_lower LIKE '%hôpital saint-andré bordeaux%'
  THEN
    RETURN 'Bordeaux';
  END IF;
  
  -- ===== TOULOUSE =====
  IF v_addr_lower LIKE '%, toulouse%'
     OR v_addr_lower LIKE '%toulouse, france%'
     OR v_addr_lower LIKE '%310%'
     OR v_addr_lower LIKE '%, 31%'
     -- Monuments Toulouse
     OR v_addr_lower LIKE '%place du capitole%'
     OR v_addr_lower LIKE '%capitole%' AND v_addr_lower LIKE '%toulouse%'
     OR v_addr_lower LIKE '%basilique saint-sernin%'
     OR v_addr_lower LIKE '%cité de l''espace%'
     OR v_addr_lower LIKE '%canal du midi%'
     -- Hôpitaux Toulouse
     OR v_addr_lower LIKE '%chu toulouse%'
     OR v_addr_lower LIKE '%hôpital purpan%'
     OR v_addr_lower LIKE '%hôpital rangueil%'
  THEN
    RETURN 'Toulouse';
  END IF;
  
  -- ===== NICE =====
  IF v_addr_lower LIKE '%, nice%'
     OR v_addr_lower LIKE '%nice, france%'
     OR v_addr_lower LIKE '%060%'
     OR v_addr_lower LIKE '%, 06%'
     -- Monuments Nice
     OR v_addr_lower LIKE '%promenade des anglais%'
     OR v_addr_lower LIKE '%place masséna%'
     OR v_addr_lower LIKE '%vieux nice%'
     OR v_addr_lower LIKE '%colline du château%'
     OR v_addr_lower LIKE '%musée matisse%'
     OR v_addr_lower LIKE '%musée chagall%'
     -- Hôpitaux Nice
     OR v_addr_lower LIKE '%chu nice%'
     OR v_addr_lower LIKE '%hôpital pasteur nice%'
     OR v_addr_lower LIKE '%hôpital l''archet%'
  THEN
    RETURN 'Nice';
  END IF;
  
  -- ===== NANTES =====
  IF v_addr_lower LIKE '%, nantes%'
     OR v_addr_lower LIKE '%nantes, france%'
     OR v_addr_lower LIKE '%440%'
     OR v_addr_lower LIKE '%, 44%'
     -- Monuments Nantes
     OR v_addr_lower LIKE '%château des ducs%'
     OR v_addr_lower LIKE '%machines de l''île%'
     OR v_addr_lower LIKE '%éléphant%' AND v_addr_lower LIKE '%nantes%'
     OR v_addr_lower LIKE '%passage pommeraye%'
     -- Hôpitaux Nantes
     OR v_addr_lower LIKE '%chu nantes%'
     OR v_addr_lower LIKE '%hôtel-dieu nantes%'
  THEN
    RETURN 'Nantes';
  END IF;
  
  -- ===== STRASBOURG =====
  IF v_addr_lower LIKE '%, strasbourg%'
     OR v_addr_lower LIKE '%strasbourg, france%'
     OR v_addr_lower LIKE '%670%'
     OR v_addr_lower LIKE '%, 67%'
     -- Monuments Strasbourg
     OR v_addr_lower LIKE '%cathédrale de strasbourg%'
     OR v_addr_lower LIKE '%petite france%'
     OR v_addr_lower LIKE '%parlement européen%'
     OR v_addr_lower LIKE '%place kléber%'
     -- Hôpitaux Strasbourg
     OR v_addr_lower LIKE '%chu strasbourg%'
     OR v_addr_lower LIKE '%hôpital hautepierre%'
  THEN
    RETURN 'Strasbourg';
  END IF;
  
  -- ===== LILLE =====
  IF v_addr_lower LIKE '%, lille%'
     OR v_addr_lower LIKE '%lille, france%'
     OR v_addr_lower LIKE '%590%'
     OR v_addr_lower LIKE '%, 59%'
     -- Monuments Lille
     OR v_addr_lower LIKE '%vieux lille%'
     OR v_addr_lower LIKE '%grand place lille%'
     OR v_addr_lower LIKE '%palais des beaux-arts lille%'
     OR v_addr_lower LIKE '%citadelle de lille%'
     -- Hôpitaux Lille
     OR v_addr_lower LIKE '%chru lille%'
     OR v_addr_lower LIKE '%hôpital claude huriez%'
     OR v_addr_lower LIKE '%hôpital roger salengro%'
  THEN
    RETURN 'Lille';
  END IF;

  RETURN NULL;
END;
$$;

-- Mettre à jour get_applicable_pricing pour utiliser detect_city_from_address
CREATE OR REPLACE FUNCTION public.get_applicable_pricing(
  p_driver_id UUID,
  p_pickup_address TEXT DEFAULT NULL,
  p_destination_address TEXT DEFAULT NULL
)
RETURNS TABLE(pricing_type TEXT, city_pricing_id UUID, city_name TEXT)
LANGUAGE plpgsql
AS $$
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
  
  -- MÉTHODE 2: Détection intelligente via detect_city_from_address
  IF p_pickup_address IS NOT NULL THEN
    v_pickup_city := public.detect_city_from_address(p_pickup_address);
  END IF;
  
  IF p_destination_address IS NOT NULL THEN
    v_destination_city := public.detect_city_from_address(p_destination_address);
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
$$;
