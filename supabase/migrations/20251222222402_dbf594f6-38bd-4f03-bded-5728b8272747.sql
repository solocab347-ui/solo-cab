-- Fonction atomique pour accepter une course partagée avec verrouillage
-- Empêche les conditions de concurrence où plusieurs chauffeurs acceptent la même course

CREATE OR REPLACE FUNCTION public.accept_shared_course(
  p_shared_course_id UUID,
  p_driver_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  shared_course_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_shared_course RECORD;
  v_course_id UUID;
  v_sender_driver_id UUID;
  v_other_pending_count INTEGER;
BEGIN
  -- Verrouiller la ligne pour éviter les accès concurrents
  -- FOR UPDATE NOWAIT échouera immédiatement si la ligne est déjà verrouillée
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
  -- (cas où la course a été envoyée à plusieurs partenaires)
  IF EXISTS (
    SELECT 1 FROM shared_courses 
    WHERE course_id = v_course_id 
    AND status = 'accepted'
    AND id != p_shared_course_id
  ) THEN
    -- Annuler cette demande car la course a été prise par quelqu'un d'autre
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
  
  -- Accepter cette course partagée
  UPDATE shared_courses 
  SET status = 'accepted', 
      accepted_at = now(),
      updated_at = now()
  WHERE id = p_shared_course_id;
  
  -- Annuler toutes les autres demandes pour la même course (envoi à tous)
  UPDATE shared_courses 
  SET status = 'cancelled',
      updated_at = now()
  WHERE course_id = v_course_id 
  AND id != p_shared_course_id
  AND status = 'pending';
  
  -- Récupérer le nombre d'autres demandes annulées
  GET DIAGNOSTICS v_other_pending_count = ROW_COUNT;
  
  -- Mettre à jour la course originale pour changer le driver
  UPDATE courses 
  SET driver_id = p_driver_id,
      updated_at = now()
  WHERE id = v_course_id;
  
  -- Notifier le chauffeur expéditeur
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT 
    d.user_id,
    '✅ Course acceptée par un partenaire',
    'Votre course a été acceptée par un partenaire. Commission: ' || v_shared_course.commission_amount || '€',
    'success',
    '/driver-dashboard'
  FROM drivers d
  WHERE d.id = v_sender_driver_id;
  
  RETURN QUERY SELECT 
    true::BOOLEAN, 
    'Course acceptée avec succès'::TEXT,
    jsonb_build_object(
      'shared_course_id', p_shared_course_id,
      'course_id', v_course_id,
      'commission_amount', v_shared_course.commission_amount,
      'other_cancelled', v_other_pending_count
    );
    
EXCEPTION
  WHEN lock_not_available THEN
    -- Une autre transaction est en train de traiter cette course
    RETURN QUERY SELECT 
      false::BOOLEAN, 
      'Cette course est en cours de traitement par un autre chauffeur, veuillez réessayer'::TEXT,
      NULL::JSONB;
  WHEN OTHERS THEN
    RETURN QUERY SELECT 
      false::BOOLEAN, 
      ('Erreur: ' || SQLERRM)::TEXT,
      NULL::JSONB;
END;
$function$;

-- Fonction pour refuser une course partagée
CREATE OR REPLACE FUNCTION public.decline_shared_course(
  p_shared_course_id UUID,
  p_driver_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_shared_course RECORD;
BEGIN
  -- Verrouiller et récupérer
  SELECT sc.* INTO v_shared_course
  FROM shared_courses sc
  WHERE sc.id = p_shared_course_id
  FOR UPDATE;
  
  IF v_shared_course IS NULL THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Course partagée introuvable'::TEXT;
    RETURN;
  END IF;
  
  IF v_shared_course.receiver_driver_id != p_driver_id THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Non autorisé'::TEXT;
    RETURN;
  END IF;
  
  IF v_shared_course.status != 'pending' THEN
    RETURN QUERY SELECT false::BOOLEAN, 'Cette course a déjà été traitée'::TEXT;
    RETURN;
  END IF;
  
  -- Refuser
  UPDATE shared_courses 
  SET status = 'declined',
      decline_reason = p_reason,
      updated_at = now()
  WHERE id = p_shared_course_id;
  
  -- Notifier l'expéditeur
  INSERT INTO notifications (user_id, title, message, type, link)
  SELECT 
    d.user_id,
    '❌ Course refusée',
    'Un partenaire a refusé la course que vous lui avez proposée' || 
      CASE WHEN p_reason IS NOT NULL THEN '. Motif: ' || p_reason ELSE '' END,
    'warning',
    '/driver-dashboard'
  FROM drivers d
  WHERE d.id = v_shared_course.sender_driver_id;
  
  RETURN QUERY SELECT true::BOOLEAN, 'Course refusée'::TEXT;
END;
$function$;

-- Ajouter la colonne decline_reason si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'shared_courses' 
    AND column_name = 'decline_reason'
  ) THEN
    ALTER TABLE public.shared_courses ADD COLUMN decline_reason TEXT;
  END IF;
END $$;

-- Index pour améliorer les performances des requêtes de verrouillage
CREATE INDEX IF NOT EXISTS idx_shared_courses_course_status 
ON shared_courses(course_id, status);

CREATE INDEX IF NOT EXISTS idx_shared_courses_receiver_pending 
ON shared_courses(receiver_driver_id, status) 
WHERE status = 'pending';