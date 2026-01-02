-- Corriger la fonction validate_driver_numbering_integrity avec noms non ambigus
DROP FUNCTION IF EXISTS public.validate_driver_numbering_integrity(uuid);

CREATE OR REPLACE FUNCTION public.validate_driver_numbering_integrity(_driver_id uuid)
RETURNS TABLE(
  is_valid boolean,
  current_counter integer,
  max_course_num integer,
  max_quote_num integer,
  max_invoice_num integer,
  total_courses integer,
  total_devis integer,
  total_factures integer,
  found_issues text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reservation_counter INTEGER;
  v_max_course INTEGER;
  v_max_quote INTEGER;
  v_max_invoice INTEGER;
  v_courses_count INTEGER;
  v_devis_count INTEGER;
  v_factures_count INTEGER;
  v_issues TEXT[] := ARRAY[]::TEXT[];
  v_is_valid BOOLEAN := true;
BEGIN
  -- Récupérer le compteur actuel
  SELECT d.reservation_counter INTO v_reservation_counter
  FROM drivers d WHERE d.id = _driver_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::boolean, 0, 0, 0, 0, 0, 0, 0, ARRAY['Chauffeur introuvable']::TEXT[];
    RETURN;
  END IF;
  
  -- Compter les éléments
  SELECT COUNT(*)::integer INTO v_courses_count FROM courses c WHERE c.driver_id = _driver_id AND c.course_number IS NOT NULL;
  SELECT COUNT(*)::integer INTO v_devis_count FROM devis dv WHERE dv.driver_id = _driver_id AND dv.quote_number IS NOT NULL;
  SELECT COUNT(*)::integer INTO v_factures_count FROM factures f WHERE f.driver_id = _driver_id AND f.invoice_number IS NOT NULL;
  
  -- Trouver les maximums
  SELECT COALESCE(MAX(NULLIF(regexp_replace(c.course_number, '[^0-9]', '', 'g'), '')::INTEGER), 0) 
  INTO v_max_course FROM courses c WHERE c.driver_id = _driver_id AND c.course_number IS NOT NULL;
  
  SELECT COALESCE(MAX(NULLIF(regexp_replace(dv.quote_number, '[^0-9]', '', 'g'), '')::INTEGER), 0) 
  INTO v_max_quote FROM devis dv WHERE dv.driver_id = _driver_id AND dv.quote_number IS NOT NULL;
  
  SELECT COALESCE(MAX(NULLIF(regexp_replace(f.invoice_number, '[^0-9]', '', 'g'), '')::INTEGER), 0) 
  INTO v_max_invoice FROM factures f WHERE f.driver_id = _driver_id AND f.invoice_number IS NOT NULL;
  
  -- Vérifier la cohérence
  IF GREATEST(v_max_course, v_max_quote, v_max_invoice) > COALESCE(v_reservation_counter, 0) THEN
    v_is_valid := false;
    v_issues := array_append(v_issues, 'Le compteur est inférieur au numéro maximum utilisé');
  END IF;
  
  RETURN QUERY SELECT 
    v_is_valid,
    COALESCE(v_reservation_counter, 0),
    v_max_course,
    v_max_quote,
    v_max_invoice,
    v_courses_count,
    v_devis_count,
    v_factures_count,
    v_issues;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_driver_numbering_integrity(uuid) TO authenticated;