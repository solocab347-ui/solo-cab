-- ============================================================
-- MODIFICATION PRÉFIXE NUMÉROS DE DEVIS : REV → RES
-- ============================================================

-- Mise à jour de la fonction generate_quote_number pour utiliser RES au lieu de REV
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

  -- Générer le numéro de devis avec préfixe RES (au lieu de REV)
  _quote_number := 'RES-' || LPAD(_current_counter::TEXT, 3, '0');

  RETURN _quote_number;
END;
$$;