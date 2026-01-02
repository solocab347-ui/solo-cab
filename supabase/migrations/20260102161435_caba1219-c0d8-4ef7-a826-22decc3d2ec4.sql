-- =====================================================
-- CONSOLIDATION ET SÉCURISATION DU SYSTÈME DE NUMÉROTATION
-- Chaque chauffeur a sa propre séquence isolée
-- =====================================================

-- 1. Supprimer les anciennes fonctions pour les recréer proprement
DROP FUNCTION IF EXISTS public.generate_reservation_number(uuid);
DROP FUNCTION IF EXISTS public.generate_quote_number(uuid);
DROP FUNCTION IF EXISTS public.generate_invoice_number(uuid);
DROP FUNCTION IF EXISTS public.generate_course_number(uuid);

-- 2. Fonction principale de génération de numéro de réservation (avec verrou)
CREATE OR REPLACE FUNCTION public.generate_reservation_number(_driver_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_counter INTEGER;
  _reservation_number TEXT;
BEGIN
  -- Vérifier que le driver_id n'est pas null
  IF _driver_id IS NULL THEN
    RAISE EXCEPTION 'driver_id cannot be null for reservation number generation';
  END IF;

  -- Verrouiller la ligne du driver pour éviter les conflits (SELECT FOR UPDATE)
  SELECT reservation_counter INTO _current_counter
  FROM public.drivers
  WHERE id = _driver_id
  FOR UPDATE;

  -- Vérifier que le chauffeur existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver not found: %', _driver_id;
  END IF;

  -- Incrémenter le compteur
  _current_counter := COALESCE(_current_counter, 0) + 1;

  -- Mettre à jour le compteur
  UPDATE public.drivers
  SET reservation_counter = _current_counter
  WHERE id = _driver_id;

  -- Générer le numéro avec préfixe RES et padding à 3 chiffres
  _reservation_number := 'RES-' || LPAD(_current_counter::TEXT, 3, '0');

  RETURN _reservation_number;
END;
$$;

-- 3. Alias pour la génération de numéro de devis (utilise le même compteur)
CREATE OR REPLACE FUNCTION public.generate_quote_number(_driver_id uuid)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.generate_reservation_number(_driver_id);
$$;

-- 4. Alias pour la génération de numéro de facture (utilise le même compteur)
CREATE OR REPLACE FUNCTION public.generate_invoice_number(_driver_id uuid)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.generate_reservation_number(_driver_id);
$$;

-- 5. Alias pour la génération de numéro de course (utilise le même compteur)
CREATE OR REPLACE FUNCTION public.generate_course_number(_driver_id uuid)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.generate_reservation_number(_driver_id);
$$;

-- 6. Fonction de validation pour accepter un devis (avec verrou atomique)
CREATE OR REPLACE FUNCTION public.accept_devis_safely(_devis_id uuid, _client_user_id uuid)
RETURNS TABLE(success boolean, message text, course_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  SET status = 'accepted', accepted_at = now()
  WHERE id = _devis_id;

  -- Si le chauffeur a créé la course, la confirmer directement
  IF v_is_driver_created THEN
    UPDATE courses
    SET status = 'accepted'
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

-- 7. Fonction pour valider l'intégrité des numéros d'un chauffeur
CREATE OR REPLACE FUNCTION public.validate_driver_numbering(_driver_id uuid)
RETURNS TABLE(is_valid boolean, issues text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _issues TEXT[] := ARRAY[]::TEXT[];
  _counter INTEGER;
  _courses_count INTEGER;
  _max_course_num INTEGER;
BEGIN
  -- Récupérer le compteur actuel
  SELECT reservation_counter INTO _counter
  FROM drivers WHERE id = _driver_id;

  -- Compter les courses
  SELECT COUNT(*) INTO _courses_count
  FROM courses WHERE driver_id = _driver_id;

  -- Vérifier si le compteur correspond au nombre de courses
  IF _counter != _courses_count THEN
    _issues := array_append(_issues, 'Compteur (' || _counter || ') != nombre de courses (' || _courses_count || ')');
  END IF;

  -- Vérifier s'il y a des doublons de numéros de course
  IF EXISTS (
    SELECT course_number, COUNT(*) 
    FROM courses 
    WHERE driver_id = _driver_id 
    GROUP BY course_number 
    HAVING COUNT(*) > 1
  ) THEN
    _issues := array_append(_issues, 'Doublons détectés dans les numéros de course');
  END IF;

  -- Vérifier s'il y a des doublons de numéros de devis
  IF EXISTS (
    SELECT quote_number, COUNT(*) 
    FROM devis 
    WHERE driver_id = _driver_id 
    GROUP BY quote_number 
    HAVING COUNT(*) > 1
  ) THEN
    _issues := array_append(_issues, 'Doublons détectés dans les numéros de devis');
  END IF;

  RETURN QUERY SELECT array_length(_issues, 1) IS NULL OR array_length(_issues, 1) = 0, _issues;
END;
$$;

-- 8. Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.generate_reservation_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_quote_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_course_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_devis_safely(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_driver_numbering(uuid) TO authenticated;