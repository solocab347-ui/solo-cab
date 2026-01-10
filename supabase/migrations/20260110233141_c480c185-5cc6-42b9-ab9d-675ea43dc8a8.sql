
-- Drop et recréer la fonction avec la bonne signature
DROP FUNCTION IF EXISTS public.accept_devis_safely(uuid, uuid);

CREATE FUNCTION public.accept_devis_safely(
  _devis_id UUID,
  _client_user_id UUID
)
RETURNS TABLE(success boolean, message text, course_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
VOLATILE
AS $$
DECLARE
  v_devis RECORD;
  v_course_id UUID;
  v_driver_user_id UUID;
  v_is_driver_created BOOLEAN;
  v_course_created_by UUID;
  v_client_id UUID;
BEGIN
  -- Récupérer le devis ET le user_id du driver séparément pour éviter les ambiguïtés
  SELECT d.*, dr.user_id 
  INTO v_devis
  FROM devis d
  JOIN drivers dr ON d.driver_id = dr.id
  WHERE d.id = _devis_id
  FOR UPDATE OF d NOWAIT;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Devis introuvable'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Stocker le driver_user_id de façon explicite (vient de la jointure avec drivers)
  v_driver_user_id := v_devis.user_id;

  -- Vérifier que le devis est en attente
  IF v_devis.status != 'pending' THEN
    RETURN QUERY SELECT false, ('Devis déjà traité (statut: ' || v_devis.status || ')')::text, NULL::uuid;
    RETURN;
  END IF;

  -- Récupérer le client_id de l'utilisateur
  SELECT id INTO v_client_id
  FROM clients
  WHERE user_id = _client_user_id;

  -- Vérifier que le client est le bon
  IF v_client_id IS NULL OR v_client_id != v_devis.client_id THEN
    RETURN QUERY SELECT false, 'Non autorisé à accepter ce devis'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Récupérer la course associée et vérifier qui l'a créée
  v_course_id := v_devis.course_id;
  
  SELECT created_by_user_id INTO v_course_created_by
  FROM courses WHERE id = v_course_id;
  
  -- Le chauffeur a créé la course si created_by_user_id = user_id du driver
  v_is_driver_created := (v_course_created_by IS NOT NULL AND v_course_created_by = v_driver_user_id);

  -- Accepter le devis
  UPDATE devis
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE id = _devis_id;

  -- Si le chauffeur a créé la course, la confirmer directement (status = 'accepted')
  IF v_is_driver_created THEN
    UPDATE courses
    SET status = 'accepted', updated_at = now()
    WHERE id = v_course_id;

    -- Notifier le chauffeur
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_driver_user_id,
      'Devis accepté !',
      'Le client a accepté votre devis ' || COALESCE(v_devis.quote_number, 'N/A') || '. La course est confirmée.',
      'devis_accepted',
      '/driver-dashboard?tab=courses'
    );

    RETURN QUERY SELECT true, 'Devis accepté ! Course confirmée.'::text, v_course_id;
  ELSE
    -- Le CLIENT a créé la course → mettre en "pending" pour que le chauffeur accepte
    UPDATE courses
    SET status = 'pending', updated_at = now()
    WHERE id = v_course_id;

    -- Notifier le chauffeur qu'il doit accepter
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_driver_user_id,
      'Nouveau devis accepté - Action requise',
      'Le client a accepté le devis ' || COALESCE(v_devis.quote_number, 'N/A') || '. Veuillez accepter ou refuser cette course.',
      'devis_accepted',
      '/driver-dashboard?tab=courses'
    );

    RETURN QUERY SELECT true, 'Devis accepté ! En attente de confirmation du chauffeur.'::text, v_course_id;
  END IF;

EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY SELECT false, 'Devis en cours de traitement, veuillez réessayer'::text, NULL::uuid;
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Erreur: ' || SQLERRM)::text, NULL::uuid;
END;
$$;
