-- Corriger la fonction generate_invoice_number pour utiliser le bon compteur et format
CREATE OR REPLACE FUNCTION public.generate_invoice_number(_driver_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_counter INTEGER;
  _invoice_number TEXT;
  _max_attempts INTEGER := 5;
  _attempt INTEGER := 0;
BEGIN
  -- Validation stricte de l'entrée
  IF _driver_id IS NULL THEN
    RAISE EXCEPTION 'ERREUR CRITIQUE: driver_id ne peut pas être NULL pour la génération de numéro de facture';
  END IF;

  LOOP
    _attempt := _attempt + 1;
    
    BEGIN
      -- Verrouillage pessimiste de la ligne du chauffeur
      SELECT invoice_counter INTO _current_counter
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
      SET invoice_counter = _current_counter,
          updated_at = now()
      WHERE id = _driver_id;

      -- Génération du numéro formaté FAC-XXX
      _invoice_number := 'FAC-' || LPAD(_current_counter::TEXT, 3, '0');

      RETURN _invoice_number;
      
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