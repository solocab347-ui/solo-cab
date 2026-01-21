
-- Supprimer l'ancienne fonction get_public_driver_profile_by_id pour pouvoir la recréer
DROP FUNCTION IF EXISTS public.get_public_driver_profile_by_id(uuid);

-- METTRE À JOUR la fonction get_public_driver_profile_by_id
CREATE OR REPLACE FUNCTION public.get_public_driver_profile_by_id(driver_id_param uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  company_name text,
  vehicle_model text,
  vehicle_brand text,
  vehicle_color text,
  vehicle_year integer,
  bio text,
  service_description text,
  services_offered text[],
  vehicle_equipment text[],
  working_sectors text[],
  vehicle_photos text[],
  gallery_photos text[],
  rating numeric,
  total_rides integer,
  max_passengers integer,
  display_driver_name boolean,
  display_company_name boolean,
  show_phone boolean,
  show_email boolean,
  card_photo_url text,
  is_pioneer boolean,
  vehicle_category text[],
  profile_full_name text,
  profile_photo_url text,
  profile_phone text,
  profile_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.user_id,
    d.company_name,
    d.vehicle_model,
    d.vehicle_brand,
    d.vehicle_color,
    d.vehicle_year,
    d.bio,
    d.service_description,
    d.services_offered,
    d.vehicle_equipment,
    d.working_sectors,
    d.vehicle_photos,
    d.gallery_photos,
    d.rating,
    d.total_rides,
    d.max_passengers,
    d.display_driver_name,
    d.display_company_name,
    d.show_phone,
    d.show_email,
    d.card_photo_url,
    d.is_pioneer,
    d.vehicle_category,
    p.full_name AS profile_full_name,
    p.profile_photo_url AS profile_photo_url,
    CASE WHEN d.show_phone = true THEN p.phone ELSE NULL END AS profile_phone,
    CASE WHEN d.show_email = true THEN p.email ELSE NULL END AS profile_email
  FROM drivers d
  LEFT JOIN profiles p ON d.user_id = p.id
  WHERE d.id = driver_id_param
    AND d.public_profile_enabled = true
    AND public.driver_should_be_visible(
      d.status, d.is_pioneer, d.free_access_end_date,
      d.subscription_paid, d.subscription_status, d.free_access_granted,
      d.created_at, d.is_fleet_driver, d.fleet_manager_id
    );
END;
$$;

-- Supprimer l'ancienne fonction get_drivers_with_full_access pour pouvoir la recréer
DROP FUNCTION IF EXISTS public.get_drivers_with_full_access(text, integer);

-- METTRE À JOUR la fonction get_drivers_with_full_access 
CREATE OR REPLACE FUNCTION public.get_drivers_with_full_access(
  visibility_field text,
  limit_count integer DEFAULT 100
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  company_name text,
  vehicle_model text,
  vehicle_brand text,
  vehicle_color text,
  vehicle_year integer,
  bio text,
  service_description text,
  services_offered text[],
  vehicle_equipment text[],
  working_sectors text[],
  vehicle_photos text[],
  gallery_photos text[],
  rating numeric,
  total_rides integer,
  max_passengers integer,
  display_driver_name boolean,
  display_company_name boolean,
  show_phone boolean,
  show_email boolean,
  card_photo_url text,
  is_pioneer boolean,
  vehicle_category text[],
  status driver_status,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT 
      d.id,
      d.user_id,
      d.company_name,
      d.vehicle_model,
      d.vehicle_brand,
      d.vehicle_color,
      d.vehicle_year,
      d.bio,
      d.service_description,
      d.services_offered,
      d.vehicle_equipment,
      d.working_sectors,
      d.vehicle_photos,
      d.gallery_photos,
      d.rating,
      d.total_rides,
      d.max_passengers,
      d.display_driver_name,
      d.display_company_name,
      d.show_phone,
      d.show_email,
      d.card_photo_url,
      d.is_pioneer,
      d.vehicle_category,
      d.status,
      d.created_at
    FROM drivers d
    WHERE d.%I = true
      AND public.driver_should_be_visible(
        d.status, d.is_pioneer, d.free_access_end_date,
        d.subscription_paid, d.subscription_status, d.free_access_granted,
        d.created_at, d.is_fleet_driver, d.fleet_manager_id
      )
    ORDER BY d.rating DESC NULLS LAST, d.created_at DESC
    LIMIT $1
  ', visibility_field) USING limit_count;
END;
$$;

-- CRÉER UNE FONCTION de diagnostic et réparation automatique
CREATE OR REPLACE FUNCTION public.diagnose_and_fix_visibility_issues()
RETURNS TABLE(
  driver_id uuid,
  driver_name text,
  issue_type text,
  was_fixed boolean,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_should_be_visible boolean;
BEGIN
  -- Parcourir tous les chauffeurs avec public_profile_enabled = true
  FOR rec IN 
    SELECT 
      d.id, 
      p.full_name,
      d.public_profile_enabled,
      d.status,
      d.is_pioneer,
      d.free_access_end_date,
      d.subscription_paid,
      d.subscription_status,
      d.free_access_granted,
      d.created_at,
      d.is_fleet_driver,
      d.fleet_manager_id
    FROM drivers d
    LEFT JOIN profiles p ON d.user_id = p.id
    WHERE d.public_profile_enabled = true
  LOOP
    v_should_be_visible := public.driver_should_be_visible(
      rec.status, rec.is_pioneer, rec.free_access_end_date,
      rec.subscription_paid, rec.subscription_status, rec.free_access_granted,
      rec.created_at, rec.is_fleet_driver, rec.fleet_manager_id
    );
    
    -- Si le profil devrait être visible mais ne l'est pas dans la vue
    IF NOT v_should_be_visible THEN
      driver_id := rec.id;
      driver_name := rec.full_name;
      issue_type := 'PROFILE_NOT_VISIBLE';
      was_fixed := false;
      
      -- Analyser pourquoi
      IF rec.is_fleet_driver = true OR rec.fleet_manager_id IS NOT NULL THEN
        details := 'Chauffeur de flotte - ne peut pas avoir de profil public';
      ELSIF rec.status NOT IN ('pending', 'validated', 'on_hold') THEN
        details := 'Statut invalide: ' || rec.status::text || '. Doit être pending, validated ou on_hold.';
      ELSIF rec.created_at <= (now() - interval '30 days') 
            AND rec.status != 'validated' 
            AND NOT (rec.is_pioneer AND rec.free_access_end_date > now())
            AND NOT rec.free_access_granted
            AND NOT (rec.subscription_paid AND rec.subscription_status = 'active') THEN
        details := 'Période d''essai de 30 jours expirée. Abonnement requis.';
        
        -- Auto-fix: si le chauffeur a un abonnement payé mais status incorrect
        IF rec.subscription_paid = true AND rec.subscription_status != 'active' THEN
          UPDATE drivers SET subscription_status = 'active' WHERE drivers.id = rec.id;
          was_fixed := true;
          details := details || ' CORRIGÉ: subscription_status mis à active.';
        END IF;
      ELSE
        details := 'Raison inconnue - vérification manuelle requise';
      END IF;
      
      RETURN NEXT;
    END IF;
  END LOOP;
  
  -- Vérifier les chauffeurs qui devraient être visibles mais n'ont pas activé leur profil
  FOR rec IN
    SELECT 
      d.id,
      p.full_name,
      d.status,
      d.subscription_paid,
      d.subscription_status,
      d.is_pioneer,
      d.free_access_end_date
    FROM drivers d
    LEFT JOIN profiles p ON d.user_id = p.id
    WHERE d.public_profile_enabled = false
      AND (d.is_fleet_driver IS NULL OR d.is_fleet_driver = false)
      AND d.fleet_manager_id IS NULL
      AND (
        d.status = 'validated'
        OR (d.subscription_paid = true AND d.subscription_status = 'active')
        OR (d.is_pioneer = true AND d.free_access_end_date > now())
      )
  LOOP
    driver_id := rec.id;
    driver_name := rec.full_name;
    issue_type := 'PROFILE_SHOULD_BE_ENABLED';
    was_fixed := false;
    details := 'Chauffeur éligible mais profil public non activé. Status: ' || rec.status::text;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- CRÉER UN TRIGGER pour auto-configurer les nouveaux chauffeurs
CREATE OR REPLACE FUNCTION public.setup_new_driver_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- S'assurer que les valeurs par défaut sont correctes pour un nouveau chauffeur
  IF NEW.subscription_status IS NULL THEN
    NEW.subscription_status := 'inactive';
  END IF;
  
  IF NEW.subscription_paid IS NULL THEN
    NEW.subscription_paid := false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS tr_setup_new_driver_defaults ON drivers;

-- Créer le trigger
CREATE TRIGGER tr_setup_new_driver_defaults
  BEFORE INSERT ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION setup_new_driver_defaults();

-- CRÉER UNE FONCTION pour corriger automatiquement tous les problèmes de visibilité
CREATE OR REPLACE FUNCTION public.auto_fix_all_visibility_issues()
RETURNS TABLE(
  total_issues_found integer,
  total_issues_fixed integer,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_found integer := 0;
  v_fixed integer := 0;
  v_details jsonb := '[]'::jsonb;
  rec RECORD;
BEGIN
  -- Corriger les subscription_status incorrects
  FOR rec IN
    UPDATE drivers 
    SET subscription_status = 'active'
    WHERE subscription_paid = true 
      AND subscription_status != 'active'
    RETURNING id, company_name
  LOOP
    v_found := v_found + 1;
    v_fixed := v_fixed + 1;
    v_details := v_details || jsonb_build_object(
      'driver_id', rec.id,
      'fix', 'subscription_status corrected to active'
    );
  END LOOP;
  
  -- Corriger les pionniers avec accès expiré mais toujours marqués comme actifs
  FOR rec IN
    UPDATE drivers 
    SET subscription_status = 'trial_ended'
    WHERE is_pioneer = true 
      AND free_access_end_date < now()
      AND subscription_paid = false
      AND subscription_status = 'active'
    RETURNING id, company_name
  LOOP
    v_found := v_found + 1;
    v_fixed := v_fixed + 1;
    v_details := v_details || jsonb_build_object(
      'driver_id', rec.id,
      'fix', 'pioneer trial ended - status updated'
    );
  END LOOP;
  
  total_issues_found := v_found;
  total_issues_fixed := v_fixed;
  details := v_details;
  
  RETURN NEXT;
END;
$$;

-- GRANT les permissions nécessaires
GRANT EXECUTE ON FUNCTION public.get_public_driver_profile_by_id TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_drivers_with_full_access TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.diagnose_and_fix_visibility_issues TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_fix_all_visibility_issues TO authenticated;
