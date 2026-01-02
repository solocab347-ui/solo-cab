-- =====================================================
-- MIGRATION DE CONSOLIDATION DE L'ARCHITECTURE SOLOCAB
-- Cette migration renforce la sécurité et la robustesse
-- du système de numérotation et de validation
-- =====================================================

-- 1. Fonction de validation de l'intégrité de la numérotation par chauffeur
CREATE OR REPLACE FUNCTION public.validate_driver_numbering_integrity(_driver_id uuid)
RETURNS TABLE(
  is_valid boolean,
  reservation_counter integer,
  max_course_number integer,
  max_quote_number integer,
  max_invoice_number integer,
  courses_count integer,
  devis_count integer,
  factures_count integer,
  issues text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _reservation_counter INTEGER;
  _max_course INTEGER;
  _max_quote INTEGER;
  _max_invoice INTEGER;
  _courses_count INTEGER;
  _devis_count INTEGER;
  _factures_count INTEGER;
  _issues TEXT[] := ARRAY[]::TEXT[];
  _is_valid BOOLEAN := true;
BEGIN
  -- Récupérer le compteur actuel
  SELECT reservation_counter INTO _reservation_counter
  FROM drivers WHERE id = _driver_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 0, 0, 0, 0, 0, ARRAY['Chauffeur introuvable']::TEXT[];
    RETURN;
  END IF;
  
  -- Compter les éléments
  SELECT COUNT(*) INTO _courses_count FROM courses WHERE driver_id = _driver_id AND course_number IS NOT NULL;
  SELECT COUNT(*) INTO _devis_count FROM devis WHERE driver_id = _driver_id AND quote_number IS NOT NULL;
  SELECT COUNT(*) INTO _factures_count FROM factures WHERE driver_id = _driver_id AND invoice_number IS NOT NULL;
  
  -- Trouver les maximums
  SELECT COALESCE(MAX(NULLIF(regexp_replace(course_number, '[^0-9]', '', 'g'), '')::INTEGER), 0) 
  INTO _max_course FROM courses WHERE driver_id = _driver_id AND course_number IS NOT NULL;
  
  SELECT COALESCE(MAX(NULLIF(regexp_replace(quote_number, '[^0-9]', '', 'g'), '')::INTEGER), 0) 
  INTO _max_quote FROM devis WHERE driver_id = _driver_id AND quote_number IS NOT NULL;
  
  SELECT COALESCE(MAX(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '')::INTEGER), 0) 
  INTO _max_invoice FROM factures WHERE driver_id = _driver_id AND invoice_number IS NOT NULL;
  
  -- Vérifier la cohérence
  IF GREATEST(_max_course, _max_quote, _max_invoice) > COALESCE(_reservation_counter, 0) THEN
    _is_valid := false;
    _issues := array_append(_issues, 'Le compteur est inférieur au numéro maximum utilisé');
  END IF;
  
  RETURN QUERY SELECT 
    _is_valid,
    COALESCE(_reservation_counter, 0),
    _max_course,
    _max_quote,
    _max_invoice,
    _courses_count,
    _devis_count,
    _factures_count,
    _issues;
END;
$$;

-- 2. Fonction de réparation automatique du compteur si nécessaire
CREATE OR REPLACE FUNCTION public.repair_driver_counter(_driver_id uuid)
RETURNS TABLE(success boolean, message text, old_counter integer, new_counter integer)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _old_counter INTEGER;
  _max_used INTEGER;
  _max_course INTEGER;
  _max_quote INTEGER;
  _max_invoice INTEGER;
BEGIN
  -- Verrouiller la ligne du driver
  SELECT reservation_counter INTO _old_counter
  FROM drivers WHERE id = _driver_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Chauffeur introuvable'::text, 0, 0;
    RETURN;
  END IF;
  
  -- Trouver les maximums
  SELECT COALESCE(MAX(NULLIF(regexp_replace(course_number, '[^0-9]', '', 'g'), '')::INTEGER), 0) 
  INTO _max_course FROM courses WHERE driver_id = _driver_id AND course_number IS NOT NULL;
  
  SELECT COALESCE(MAX(NULLIF(regexp_replace(quote_number, '[^0-9]', '', 'g'), '')::INTEGER), 0) 
  INTO _max_quote FROM devis WHERE driver_id = _driver_id AND quote_number IS NOT NULL;
  
  SELECT COALESCE(MAX(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '')::INTEGER), 0) 
  INTO _max_invoice FROM factures WHERE driver_id = _driver_id AND invoice_number IS NOT NULL;
  
  _max_used := GREATEST(_max_course, _max_quote, _max_invoice);
  
  -- Réparer si nécessaire
  IF _max_used > COALESCE(_old_counter, 0) THEN
    UPDATE drivers SET reservation_counter = _max_used WHERE id = _driver_id;
    RETURN QUERY SELECT true, 'Compteur réparé'::text, COALESCE(_old_counter, 0), _max_used;
  ELSE
    RETURN QUERY SELECT true, 'Aucune réparation nécessaire'::text, COALESCE(_old_counter, 0), COALESCE(_old_counter, 0);
  END IF;
END;
$$;

-- 3. Trigger pour vérifier l'intégrité avant insertion sur courses
CREATE OR REPLACE FUNCTION public.validate_course_number_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si course_number est fourni, vérifier qu'il n'existe pas déjà pour ce driver
  IF NEW.course_number IS NOT NULL AND NEW.driver_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM courses 
      WHERE driver_id = NEW.driver_id 
      AND course_number = NEW.course_number 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    ) THEN
      RAISE EXCEPTION 'Le numéro de course % existe déjà pour ce chauffeur', NEW.course_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_course_number_trigger ON courses;
CREATE TRIGGER validate_course_number_trigger
BEFORE INSERT OR UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION validate_course_number_before_insert();

-- 4. Trigger pour vérifier l'intégrité avant insertion sur devis
CREATE OR REPLACE FUNCTION public.validate_quote_number_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si quote_number est fourni, vérifier qu'il n'existe pas déjà pour ce driver
  IF NEW.quote_number IS NOT NULL AND NEW.driver_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM devis 
      WHERE driver_id = NEW.driver_id 
      AND quote_number = NEW.quote_number 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    ) THEN
      RAISE EXCEPTION 'Le numéro de devis % existe déjà pour ce chauffeur', NEW.quote_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_quote_number_trigger ON devis;
CREATE TRIGGER validate_quote_number_trigger
BEFORE INSERT OR UPDATE ON devis
FOR EACH ROW
EXECUTE FUNCTION validate_quote_number_before_insert();

-- 5. Trigger pour vérifier l'intégrité avant insertion sur factures
CREATE OR REPLACE FUNCTION public.validate_invoice_number_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Si invoice_number est fourni, vérifier qu'il n'existe pas déjà pour ce driver
  IF NEW.invoice_number IS NOT NULL AND NEW.driver_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM factures 
      WHERE driver_id = NEW.driver_id 
      AND invoice_number = NEW.invoice_number 
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    ) THEN
      RAISE EXCEPTION 'Le numéro de facture % existe déjà pour ce chauffeur', NEW.invoice_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_invoice_number_trigger ON factures;
CREATE TRIGGER validate_invoice_number_trigger
BEFORE INSERT OR UPDATE ON factures
FOR EACH ROW
EXECUTE FUNCTION validate_invoice_number_before_insert();

-- 6. Fonction atomique robuste pour générer un numéro de réservation
DROP FUNCTION IF EXISTS public.generate_reservation_number(uuid);
CREATE OR REPLACE FUNCTION public.generate_reservation_number(_driver_id uuid)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current_counter INTEGER;
  _reservation_number TEXT;
  _max_attempts INTEGER := 5;
  _attempt INTEGER := 0;
BEGIN
  -- Validation stricte de l'entrée
  IF _driver_id IS NULL THEN
    RAISE EXCEPTION 'ERREUR CRITIQUE: driver_id ne peut pas être NULL pour la génération de numéro';
  END IF;

  LOOP
    _attempt := _attempt + 1;
    
    BEGIN
      -- Verrouillage pessimiste de la ligne du chauffeur
      SELECT reservation_counter INTO _current_counter
      FROM public.drivers
      WHERE id = _driver_id
      FOR UPDATE NOWAIT;

      -- Vérification que le chauffeur existe
      IF NOT FOUND THEN
        RAISE EXCEPTION 'ERREUR CRITIQUE: Chauffeur non trouvé (ID: %)', _driver_id;
      END IF;

      -- Incrémentation atomique
      _current_counter := COALESCE(_current_counter, 0) + 1;

      -- Mise à jour du compteur
      UPDATE public.drivers
      SET reservation_counter = _current_counter,
          updated_at = now()
      WHERE id = _driver_id;

      -- Génération du numéro formaté
      _reservation_number := 'RES-' || LPAD(_current_counter::TEXT, 3, '0');

      RETURN _reservation_number;
      
    EXCEPTION
      WHEN lock_not_available THEN
        -- Si verrouillage échoue, réessayer
        IF _attempt >= _max_attempts THEN
          RAISE EXCEPTION 'Impossible d''obtenir le verrou après % tentatives', _max_attempts;
        END IF;
        PERFORM pg_sleep(0.1 * _attempt); -- Backoff exponentiel
    END;
  END LOOP;
END;
$$;

-- 7. S'assurer que toutes les contraintes existent
-- Contrainte unique sur courses (driver_id, course_number)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'courses_driver_course_number_unique'
  ) THEN
    CREATE UNIQUE INDEX courses_driver_course_number_unique 
    ON public.courses(driver_id, course_number) 
    WHERE course_number IS NOT NULL;
  END IF;
END $$;

-- Contrainte unique sur devis (driver_id, quote_number)
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

-- Contrainte unique sur factures (driver_id, invoice_number)
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

-- 8. Accorder les permissions
GRANT EXECUTE ON FUNCTION public.validate_driver_numbering_integrity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repair_driver_counter(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_reservation_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_devis_safely(uuid, uuid) TO authenticated;

-- 9. Réparer tous les compteurs existants pour s'assurer de la cohérence
DO $$
DECLARE
  driver_record RECORD;
BEGIN
  FOR driver_record IN SELECT id FROM drivers LOOP
    PERFORM repair_driver_counter(driver_record.id);
  END LOOP;
END $$;