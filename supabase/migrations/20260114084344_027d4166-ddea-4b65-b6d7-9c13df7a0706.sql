-- ========================================
-- SYSTÈME DE RÉPARATION DES FACTURES MANQUANTES
-- ========================================

-- Fonction RPC pour réparer une course complétée sans facture
CREATE OR REPLACE FUNCTION public.repair_missing_facture(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course RECORD;
  v_devis RECORD;
  v_facture RECORD;
  v_driver RECORD;
  v_new_devis_id uuid;
  v_quote_number text;
  v_result jsonb;
BEGIN
  -- Récupérer la course
  SELECT * INTO v_course FROM courses WHERE id = p_course_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Course introuvable');
  END IF;
  
  IF v_course.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'La course n''est pas complétée');
  END IF;
  
  -- Vérifier si une facture existe déjà
  SELECT * INTO v_facture FROM factures WHERE course_id = p_course_id LIMIT 1;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Facture existe déjà', 'facture_id', v_facture.id);
  END IF;
  
  -- Chercher un devis existant
  SELECT * INTO v_devis FROM devis WHERE course_id = p_course_id ORDER BY created_at DESC LIMIT 1;
  
  -- Si pas de devis, en créer un
  IF NOT FOUND THEN
    -- Récupérer les infos du chauffeur
    SELECT * INTO v_driver FROM drivers WHERE id = v_course.driver_id;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Chauffeur introuvable');
    END IF;
    
    -- Générer un numéro de réservation
    v_driver.reservation_counter := COALESCE(v_driver.reservation_counter, 0) + 1;
    v_quote_number := 'RES-' || LPAD(v_driver.reservation_counter::text, 3, '0');
    
    -- Mettre à jour le compteur
    UPDATE drivers SET reservation_counter = v_driver.reservation_counter WHERE id = v_course.driver_id;
    
    -- Calculer le prix
    DECLARE
      v_base_price numeric := COALESCE(v_driver.base_rate, 5);
      v_distance_price numeric := COALESCE(v_course.distance_km, 0) * COALESCE(v_driver.rate_per_km, 2.5);
      v_total_price numeric := COALESCE(v_course.guest_estimated_price, v_base_price + v_distance_price);
    BEGIN
      INSERT INTO devis (
        course_id, driver_id, client_id,
        amount, base_price, distance_price, time_price, discount_amount,
        status, accepted_at, valid_until, quote_number
      ) VALUES (
        p_course_id, v_course.driver_id, v_course.client_id,
        v_total_price, v_base_price, v_distance_price, 0, 0,
        'accepted', now(), now() + interval '30 days', v_quote_number
      ) RETURNING * INTO v_devis;
      
      -- Mettre à jour la course
      UPDATE courses SET course_number = v_quote_number WHERE id = p_course_id;
    END;
  ELSE
    v_quote_number := v_devis.quote_number;
    
    -- S'assurer que le devis est accepté
    IF v_devis.status != 'accepted' THEN
      UPDATE devis SET status = 'accepted', accepted_at = now() WHERE id = v_devis.id;
    END IF;
  END IF;
  
  -- Créer la facture
  INSERT INTO factures (
    driver_id, course_id, devis_id, client_id,
    invoice_number, amount, discount_amount, promo_code,
    payment_method, payment_status, paid_at
  ) VALUES (
    v_course.driver_id, p_course_id, v_devis.id, v_course.client_id,
    v_quote_number, v_devis.amount, COALESCE(v_devis.discount_amount, 0), v_devis.promo_code,
    COALESCE(v_course.payment_method_used, 'card'), 'paid', now()
  ) RETURNING * INTO v_facture;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Facture créée avec succès',
    'facture_id', v_facture.id,
    'invoice_number', v_quote_number,
    'amount', v_devis.amount
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Fonction pour réparer toutes les factures manquantes d'un chauffeur
CREATE OR REPLACE FUNCTION public.repair_all_missing_factures(p_driver_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course RECORD;
  v_result jsonb;
  v_results jsonb[] := ARRAY[]::jsonb[];
  v_repaired int := 0;
  v_failed int := 0;
BEGIN
  FOR v_course IN 
    SELECT c.id, c.course_number
    FROM courses c
    LEFT JOIN factures f ON f.course_id = c.id
    WHERE c.status = 'completed' 
      AND f.id IS NULL
      AND (p_driver_id IS NULL OR c.driver_id = p_driver_id)
    ORDER BY c.created_at DESC
  LOOP
    v_result := repair_missing_facture(v_course.id);
    v_results := array_append(v_results, jsonb_build_object(
      'course_id', v_course.id,
      'course_number', v_course.course_number,
      'result', v_result
    ));
    
    IF (v_result->>'success')::boolean THEN
      v_repaired := v_repaired + 1;
    ELSE
      v_failed := v_failed + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'total_processed', v_repaired + v_failed,
    'repaired', v_repaired,
    'failed', v_failed,
    'details', to_jsonb(v_results)
  );
END;
$$;

-- Index pour améliorer les performances des requêtes de réparation
CREATE INDEX IF NOT EXISTS idx_courses_status_completed ON courses(status) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_factures_course_id ON factures(course_id);
CREATE INDEX IF NOT EXISTS idx_devis_course_id ON devis(course_id);