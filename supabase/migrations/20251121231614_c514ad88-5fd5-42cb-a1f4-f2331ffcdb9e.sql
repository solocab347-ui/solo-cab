-- ============================================================
-- REFONTE SYSTÈME DE NUMÉROTATION UNIFIÉ
-- Remplace quote_counter, invoice_counter, course_counter par un seul compteur
-- ============================================================

-- Étape 1 : Ajouter le nouveau compteur unifié
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS reservation_counter INTEGER DEFAULT 0;

-- Étape 2 : Initialiser reservation_counter avec la valeur max actuelle
UPDATE public.drivers
SET reservation_counter = GREATEST(
  COALESCE(quote_counter, 0),
  COALESCE(invoice_counter, 0),
  COALESCE(course_counter, 0)
);

-- Étape 3 : Créer la nouvelle fonction de génération de numéro de réservation
CREATE OR REPLACE FUNCTION public.generate_reservation_number(_driver_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _current_counter INTEGER;
  _reservation_number TEXT;
BEGIN
  -- Verrouiller la ligne du driver pour éviter les conflits (SELECT FOR UPDATE)
  SELECT reservation_counter INTO _current_counter
  FROM public.drivers
  WHERE id = _driver_id
  FOR UPDATE;

  -- Incrémenter le compteur
  _current_counter := COALESCE(_current_counter, 0) + 1;

  -- Mettre à jour le compteur
  UPDATE public.drivers
  SET reservation_counter = _current_counter
  WHERE id = _driver_id;

  -- Générer le numéro de réservation avec préfixe RES
  _reservation_number := 'RES-' || LPAD(_current_counter::TEXT, 3, '0');

  RETURN _reservation_number;
END;
$$;

COMMENT ON FUNCTION public.generate_reservation_number IS 'Génère un numéro de réservation unique et séquentiel pour un chauffeur (RES-001, RES-002, etc.). Ce numéro est utilisé pour la course, le devis ET la facture associés.';

COMMENT ON COLUMN public.drivers.reservation_counter IS 'Compteur unifié pour toutes les réservations (courses/devis/factures). Garantit la cohérence : Course RES-001 → Devis RES-001 → Facture RES-001';

-- Les anciennes fonctions restent pour compatibilité descendante mais pointent vers le nouveau système
CREATE OR REPLACE FUNCTION public.generate_quote_number(_driver_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.generate_reservation_number(_driver_id);
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number(_driver_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.generate_reservation_number(_driver_id);
$$;

CREATE OR REPLACE FUNCTION public.generate_course_number(_driver_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.generate_reservation_number(_driver_id);
$$;