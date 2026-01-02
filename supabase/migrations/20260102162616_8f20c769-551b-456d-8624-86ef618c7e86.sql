-- Corriger la fonction accept_devis_safely pour éviter l'erreur read-only transaction
-- et ajouter les contraintes uniques manquantes sur devis et factures

-- Supprimer et recréer la fonction avec la bonne configuration
DROP FUNCTION IF EXISTS public.accept_devis_safely(uuid, uuid);

CREATE OR REPLACE FUNCTION public.accept_devis_safely(_devis_id uuid, _client_user_id uuid)
RETURNS TABLE(success boolean, message text, course_id uuid)
LANGUAGE plpgsql
VOLATILE  -- Explicitement VOLATILE car on modifie des données
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_devis RECORD;
  v_client_id UUID;
  v_course_id UUID;
  v_driver_user_id UUID;
  v_is_driver_created BOOLEAN;
BEGIN
  -- Vérifier que le devis existe et le verrouiller
  SELECT d.*, dr.user_id as driver_user_id
  INTO v_devis
  FROM devis d
  JOIN drivers dr ON d.driver_id = dr.id
  WHERE d.id = _devis_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Devis introuvable'::text, NULL::uuid;
    RETURN;
  END IF;

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

  -- Récupérer la course associée
  SELECT id, created_by_user_id INTO v_course_id, v_is_driver_created
  FROM courses
  WHERE id = v_devis.course_id;

  v_is_driver_created := (SELECT created_by_user_id FROM courses WHERE id = v_devis.course_id) = v_devis.driver_user_id;

  -- Accepter le devis
  UPDATE devis
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE id = _devis_id;

  -- Si le chauffeur a créé la course, la confirmer directement
  IF v_is_driver_created THEN
    UPDATE courses
    SET status = 'accepted', updated_at = now()
    WHERE id = v_devis.course_id;

    -- Notifier le chauffeur
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_devis.driver_user_id,
      'Devis accepté !',
      'Le client a accepté votre devis ' || v_devis.quote_number || '. La course est confirmée.',
      'devis_accepted',
      '/driver-dashboard?tab=courses'
    );

    RETURN QUERY SELECT true, 'Devis accepté ! Course confirmée.'::text, v_devis.course_id;
  ELSE
    -- Notifier le chauffeur qu'il doit accepter
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_devis.driver_user_id,
      'Nouveau devis accepté',
      'Le client a accepté le devis ' || v_devis.quote_number || '. Vous devez maintenant accepter la course.',
      'devis_accepted',
      '/driver-dashboard?tab=courses'
    );

    RETURN QUERY SELECT true, 'Devis accepté ! En attente de confirmation du chauffeur.'::text, v_devis.course_id;
  END IF;

EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY SELECT false, 'Devis en cours de traitement, veuillez réessayer'::text, NULL::uuid;
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Erreur: ' || SQLERRM)::text, NULL::uuid;
END;
$$;

-- S'assurer que les contraintes uniques existent sur devis et factures
-- Contrainte sur devis (driver_id, quote_number)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'devis_driver_quote_number_unique'
  ) THEN
    CREATE UNIQUE INDEX devis_driver_quote_number_unique 
    ON public.devis(driver_id, quote_number) 
    WHERE quote_number IS NOT NULL;
  END IF;
END $$;

-- Contrainte sur factures (driver_id, invoice_number)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'factures_driver_invoice_number_unique'
  ) THEN
    CREATE UNIQUE INDEX factures_driver_invoice_number_unique 
    ON public.factures(driver_id, invoice_number) 
    WHERE invoice_number IS NOT NULL;
  END IF;
END $$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.accept_devis_safely(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_devis_safely(uuid, uuid) TO anon;