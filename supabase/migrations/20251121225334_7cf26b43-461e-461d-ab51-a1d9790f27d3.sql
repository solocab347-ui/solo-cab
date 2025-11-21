-- ============================================================
-- CORRECTION GÉNÉRATION NUMÉROS DE DEVIS - SYSTÈME TRANSACTIONNEL
-- ============================================================

-- Fonction corrigée avec verrouillage transactionnel
-- Empêche les conditions de course lors de la génération des numéros
CREATE OR REPLACE FUNCTION public.generate_quote_number(_driver_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _current_counter INTEGER;
  _quote_number TEXT;
BEGIN
  -- Verrouiller la ligne du driver pour éviter les conflits (SELECT FOR UPDATE)
  SELECT quote_counter INTO _current_counter
  FROM public.drivers
  WHERE id = _driver_id
  FOR UPDATE;

  -- Incrémenter le compteur
  _current_counter := COALESCE(_current_counter, 0) + 1;

  -- Mettre à jour le compteur
  UPDATE public.drivers
  SET quote_counter = _current_counter
  WHERE id = _driver_id;

  -- Générer le numéro de devis avec padding
  _quote_number := 'REV-' || LPAD(_current_counter::TEXT, 3, '0');

  RETURN _quote_number;
END;
$$;

-- Fonction corrigée pour les numéros de facture
CREATE OR REPLACE FUNCTION public.generate_invoice_number(_driver_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _current_counter INTEGER;
  _invoice_number TEXT;
BEGIN
  -- Verrouiller la ligne du driver
  SELECT invoice_counter INTO _current_counter
  FROM public.drivers
  WHERE id = _driver_id
  FOR UPDATE;

  -- Incrémenter le compteur
  _current_counter := COALESCE(_current_counter, 0) + 1;

  -- Mettre à jour le compteur
  UPDATE public.drivers
  SET invoice_counter = _current_counter
  WHERE id = _driver_id;

  -- Générer le numéro de facture avec padding
  _invoice_number := 'FAC-' || LPAD(_current_counter::TEXT, 3, '0');

  RETURN _invoice_number;
END;
$$;

-- Fonction corrigée pour les numéros de course
CREATE OR REPLACE FUNCTION public.generate_course_number(_driver_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _current_counter INTEGER;
  _course_number TEXT;
BEGIN
  -- Verrouiller la ligne du driver
  SELECT course_counter INTO _current_counter
  FROM public.drivers
  WHERE id = _driver_id
  FOR UPDATE;

  -- Incrémenter le compteur
  _current_counter := COALESCE(_current_counter, 0) + 1;

  -- Mettre à jour le compteur
  UPDATE public.drivers
  SET course_counter = _current_counter
  WHERE id = _driver_id;

  -- Générer le numéro de course avec padding
  _course_number := 'DEV-' || LPAD(_current_counter::TEXT, 3, '0');

  RETURN _course_number;
END;
$$;