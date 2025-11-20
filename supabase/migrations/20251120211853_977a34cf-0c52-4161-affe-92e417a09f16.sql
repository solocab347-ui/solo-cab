-- Modifier la fonction generate_quote_number pour utiliser RES au lieu de REV
CREATE OR REPLACE FUNCTION public.generate_quote_number(_driver_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _counter INTEGER;
  _quote_number TEXT;
BEGIN
  -- Incrémenter le compteur
  UPDATE public.drivers
  SET quote_counter = quote_counter + 1
  WHERE id = _driver_id
  RETURNING quote_counter INTO _counter;
  
  -- Générer le numéro (RES-001, RES-002, etc.) au lieu de REV
  _quote_number := 'RES-' || LPAD(_counter::TEXT, 3, '0');
  
  RETURN _quote_number;
END;
$$;

-- Corriger le calcul des courses pour les mises à disposition
-- Pour les mises à disposition (_use_hourly_rate = true), seul le temps est facturé, pas la distance
CREATE OR REPLACE FUNCTION public.calculate_course_price(
  _driver_id UUID,
  _distance_km DECIMAL,
  _duration_minutes INTEGER,
  _use_hourly_rate BOOLEAN DEFAULT false
)
RETURNS TABLE (
  base_price DECIMAL,
  distance_price DECIMAL,
  time_price DECIMAL,
  subtotal DECIMAL,
  tva_amount DECIMAL,
  total_price DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base_fare DECIMAL;
  _per_km_rate DECIMAL;
  _hourly_rate DECIMAL;
  _tva_rate DECIMAL;
  _base DECIMAL;
  _distance DECIMAL;
  _time DECIMAL;
  _sub DECIMAL;
  _tva DECIMAL;
  _total DECIMAL;
BEGIN
  -- Récupérer les tarifs du chauffeur
  SELECT 
    d.base_fare,
    d.per_km_rate,
    d.hourly_rate
  INTO 
    _base_fare,
    _per_km_rate,
    _hourly_rate
  FROM public.drivers d
  WHERE d.id = _driver_id;
  
  -- Calculs selon le type de course
  IF _use_hourly_rate THEN
    -- MISE À DISPOSITION : uniquement prix horaire (pas de distance ni base)
    _base := 0;
    _distance := 0;
    _time := (_duration_minutes / 60.0) * COALESCE(_hourly_rate, 0);
    _tva_rate := 20.0;  -- 20% TVA pour mise à disposition
  ELSE
    -- COURSE CLASSIQUE : base + distance (pas de temps)
    _base := COALESCE(_base_fare, 0);
    _distance := COALESCE(_distance_km * _per_km_rate, 0);
    _time := 0;
    _tva_rate := 10.0;  -- 10% TVA pour facturation au km
  END IF;
  
  _sub := _base + _distance + _time;
  _tva := _sub * (_tva_rate / 100.0);
  _total := _sub + _tva;
  
  RETURN QUERY SELECT 
    _base,
    _distance,
    _time,
    _sub,
    _tva,
    _total;
END;
$$;