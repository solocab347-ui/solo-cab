-- ============================================================
-- SOLUTION A : NUMÉROTATION SÉPARÉE POUR LES PARTENAIRES
-- ============================================================
-- Chaque chauffeur garde sa propre séquence de numéros RES-XXX
-- Les courses partagées reçues ont un numéro PART-XXX propre au receiver

-- 1. Ajouter les colonnes de numérotation partenaire
ALTER TABLE shared_courses 
ADD COLUMN IF NOT EXISTS partner_reference_number TEXT,
ADD COLUMN IF NOT EXISTS receiver_course_number TEXT;

ALTER TABLE fleet_partner_courses 
ADD COLUMN IF NOT EXISTS partner_reference_number TEXT,
ADD COLUMN IF NOT EXISTS driver_course_number TEXT;

-- 2. Ajouter un compteur de courses partenaires sur les drivers
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS partner_course_counter INTEGER DEFAULT 0;

COMMENT ON COLUMN drivers.partner_course_counter IS 'Compteur pour les courses reçues de partenaires (PART-001, PART-002, etc.)';

-- 3. Fonction pour générer un numéro de référence partenaire
CREATE OR REPLACE FUNCTION public.generate_partner_reference_number(_driver_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_counter INTEGER;
  v_partner_number TEXT;
BEGIN
  -- Incrémenter atomiquement le compteur partenaire
  UPDATE drivers 
  SET partner_course_counter = COALESCE(partner_course_counter, 0) + 1
  WHERE id = _driver_id
  RETURNING partner_course_counter INTO v_counter;

  IF v_counter IS NULL THEN
    RAISE EXCEPTION 'Chauffeur % introuvable', _driver_id;
  END IF;

  -- Format PART-XXX
  v_partner_number := 'PART-' || LPAD(v_counter::TEXT, 3, '0');

  RETURN v_partner_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_partner_reference_number(uuid) TO authenticated;

-- 4. Modifier accept_shared_course pour NE PAS changer le driver_id de la course originale
CREATE OR REPLACE FUNCTION public.accept_shared_course(p_shared_course_id uuid, p_driver_id uuid)
RETURNS TABLE(success boolean, message text, shared_course_data jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_shared_course RECORD;
  v_course_id UUID;
  v_sender_driver_id UUID;
  v_other_pending_count INTEGER;
  v_partner_ref TEXT;
BEGIN
  -- Verrouiller la ligne pour éviter les accès concurrents
  SELECT sc.* INTO v_shared_course
  FROM shared_courses sc
  WHERE sc.id = p_shared_course_id
  FOR UPDATE NOWAIT;
  
  -- Vérifier si la course partagée existe
  IF v_shared_course IS NULL THEN
    RETURN QUERY SELECT 
      false::BOOLEAN, 
      'Course partagée introuvable'::TEXT,
      NULL::JSONB;
    RETURN;
  END IF;
  
  -- Vérifier que le driver est bien le destinataire
  IF v_shared_course.receiver_driver_id != p_driver_id THEN
    RETURN QUERY SELECT 
      false::BOOLEAN, 
      'Vous n''êtes pas autorisé à accepter cette course'::TEXT,
      NULL::JSONB;
    RETURN;
  END IF;
  
  -- Vérifier que la course n'est pas déjà acceptée
  IF v_shared_course.status != 'pending' THEN
    RETURN QUERY SELECT 
      false::BOOLEAN, 
      'Cette course a déjà été traitée (statut: ' || v_shared_course.status || ')'::TEXT,
      NULL::JSONB;
    RETURN;
  END IF;
  
  v_course_id := v_shared_course.course_id;
  v_sender_driver_id := v_shared_course.sender_driver_id;
  
  -- Vérifier si la course originale n'a pas déjà été acceptée par un autre partenaire
  IF EXISTS (
    SELECT 1 FROM shared_courses 
    WHERE course_id = v_course_id 
    AND status = 'accepted'
    AND id != p_shared_course_id
  ) THEN
    UPDATE shared_courses 
    SET status = 'cancelled', 
        updated_at = now()
    WHERE id = p_shared_course_id;
    
    RETURN QUERY SELECT 
      false::BOOLEAN, 
      'Cette course a déjà été acceptée par un autre partenaire'::TEXT,
      NULL::JSONB;
    RETURN;
  END IF;
  
  -- *** SOLUTION A : Générer un numéro partenaire pour le receiver ***
  -- Le course original garde son driver_id et course_number du sender
  -- Le receiver utilise partner_reference_number pour référencer la course
  v_partner_ref := generate_partner_reference_number(p_driver_id);
  
  -- Accepter cette course partagée avec le numéro partenaire
  UPDATE shared_courses 
  SET status = 'accepted', 
      accepted_at = now(),
      partner_reference_number = v_partner_ref,
      updated_at = now()
  WHERE id = p_shared_course_id;
  
  -- Annuler toutes les autres demandes pour la même course
  UPDATE shared_courses 
  SET status = 'cancelled',
      updated_at = now()
  WHERE course_id = v_course_id 
  AND id != p_shared_course_id
  AND status = 'pending';
  
  GET DIAGNOSTICS v_other_pending_count = ROW_COUNT;
  
  -- *** NE PLUS CHANGER le driver_id de la course originale ***
  -- La course reste attribuée au sender pour préserver sa numérotation
  -- UPDATE courses SET driver_id = p_driver_id... <-- SUPPRIMÉ
  
  -- Notifier le chauffeur expéditeur
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT 
    d.user_id,
    '✅ Course acceptée par un partenaire',
    'Votre course ' || (SELECT course_number FROM courses WHERE id = v_course_id) || ' a été acceptée. Ref partenaire: ' || v_partner_ref,
    'success',
    '/driver-dashboard?tab=partnerships&subtab=sent'
  FROM drivers d
  WHERE d.id = v_sender_driver_id;
  
  RETURN QUERY SELECT 
    true::BOOLEAN, 
    'Course acceptée avec succès. Votre référence: ' || v_partner_ref::TEXT,
    jsonb_build_object(
      'shared_course_id', p_shared_course_id,
      'course_id', v_course_id,
      'partner_reference_number', v_partner_ref,
      'commission_amount', v_shared_course.commission_amount,
      'other_cancelled', v_other_pending_count
    );
    
EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY SELECT 
      false::BOOLEAN, 
      'Cette course est en cours de traitement par un autre chauffeur'::TEXT,
      NULL::JSONB;
  WHEN OTHERS THEN
    RETURN QUERY SELECT 
      false::BOOLEAN, 
      ('Erreur: ' || SQLERRM)::TEXT,
      NULL::JSONB;
END;
$function$;

-- 5. Modifier claim_pool_course pour ne pas changer le driver_id
CREATE OR REPLACE FUNCTION public.claim_pool_course(p_shared_course_id uuid, p_claimer_driver_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_shared_course shared_courses%ROWTYPE;
  v_sender_user_id UUID;
  v_claimer_name TEXT;
  v_pickup_address TEXT;
  v_scheduled_date TIMESTAMPTZ;
  v_partner_ref TEXT;
  v_original_course_number TEXT;
BEGIN
  -- Lock the shared course row
  SELECT * INTO v_shared_course
  FROM shared_courses
  WHERE id = p_shared_course_id
  FOR UPDATE NOWAIT;
  
  IF v_shared_course.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Course non trouvée');
  END IF;
  
  IF v_shared_course.sharing_mode != 'pool' THEN
    RETURN json_build_object('success', false, 'error', 'Cette course n''est pas en mode pool');
  END IF;
  
  IF v_shared_course.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Cette course a déjà été réclamée');
  END IF;
  
  IF v_shared_course.sender_driver_id = p_claimer_driver_id THEN
    RETURN json_build_object('success', false, 'error', 'Vous ne pouvez pas réclamer votre propre course');
  END IF;
  
  -- Verify partnership exists
  IF NOT EXISTS (
    SELECT 1 FROM driver_partnerships
    WHERE status = 'active'
    AND (
      (driver_a_id = v_shared_course.sender_driver_id AND driver_b_id = p_claimer_driver_id)
      OR (driver_b_id = v_shared_course.sender_driver_id AND driver_a_id = p_claimer_driver_id)
    )
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Vous n''êtes pas partenaire avec ce chauffeur');
  END IF;
  
  -- *** Générer le numéro partenaire pour le claimer ***
  v_partner_ref := generate_partner_reference_number(p_claimer_driver_id);
  
  -- Récupérer le numéro de course original
  SELECT course_number INTO v_original_course_number
  FROM courses WHERE id = v_shared_course.course_id;
  
  -- Claim the course SANS changer le driver_id de la course originale
  UPDATE shared_courses
  SET 
    receiver_driver_id = p_claimer_driver_id,
    status = 'accepted',
    accepted_at = NOW(),
    partner_reference_number = v_partner_ref,
    receiver_notified_at = NOW(),
    updated_at = NOW()
  WHERE id = p_shared_course_id;
  
  -- Get sender info for notification
  SELECT user_id INTO v_sender_user_id
  FROM drivers WHERE id = v_shared_course.sender_driver_id;
  
  SELECT SPLIT_PART(full_name, ' ', 1) INTO v_claimer_name
  FROM profiles p
  JOIN drivers d ON d.user_id = p.id
  WHERE d.id = p_claimer_driver_id;
  
  SELECT pickup_address, scheduled_date
  INTO v_pickup_address, v_scheduled_date
  FROM courses
  WHERE id = v_shared_course.course_id;
  
  -- Notify sender
  IF v_sender_user_id IS NOT NULL AND v_pickup_address IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_sender_user_id,
      '✅ Course pool réclamée',
      COALESCE(v_claimer_name, 'Un partenaire') || ' a pris votre course ' || COALESCE(v_original_course_number, '') || ' (Ref: ' || v_partner_ref || ')',
      'success',
      '/driver-dashboard?tab=partnerships&subtab=sent'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Course réclamée avec succès. Votre référence: ' || v_partner_ref,
    'partner_reference_number', v_partner_ref,
    'original_course_number', v_original_course_number
  );
  
EXCEPTION
  WHEN lock_not_available THEN
    RETURN json_build_object('success', false, 'error', 'Cette course est en cours de traitement');
END;
$function$;

-- 6. Index pour optimiser les recherches par numéro partenaire
CREATE INDEX IF NOT EXISTS idx_shared_courses_partner_ref 
ON shared_courses(receiver_driver_id, partner_reference_number) 
WHERE partner_reference_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fleet_partner_courses_partner_ref 
ON fleet_partner_courses(driver_id, partner_reference_number) 
WHERE partner_reference_number IS NOT NULL;

-- 7. Vue pour le chauffeur receiver : voir ses courses partenaires avec son numéro
CREATE OR REPLACE VIEW public.driver_partner_courses_view AS
SELECT 
  sc.id as shared_course_id,
  sc.partner_reference_number as my_reference,
  c.course_number as original_reference,
  c.id as course_id,
  c.pickup_address,
  c.destination_address,
  c.scheduled_date,
  c.distance_km,
  c.status as course_status,
  sc.status as shared_status,
  sc.course_amount,
  sc.commission_amount,
  sc.earnings_for_receiver,
  sc.sender_driver_id,
  sc.receiver_driver_id,
  sender_profile.full_name as sender_name,
  sender_driver.company_name as sender_company
FROM shared_courses sc
JOIN courses c ON c.id = sc.course_id
JOIN drivers sender_driver ON sender_driver.id = sc.sender_driver_id
JOIN profiles sender_profile ON sender_profile.id = sender_driver.user_id
WHERE sc.status IN ('accepted', 'in_progress', 'completed');

GRANT SELECT ON public.driver_partner_courses_view TO authenticated;

-- 8. Commentaires pour documentation
COMMENT ON COLUMN shared_courses.partner_reference_number IS 'Numéro PART-XXX généré pour le receiver - sa propre référence isolée';
COMMENT ON COLUMN fleet_partner_courses.partner_reference_number IS 'Numéro PART-XXX généré pour le driver de flotte - sa propre référence isolée';