-- Fix TVA calculation: 10% for distance-based (per km), 20% for time-based (hourly)
-- Drop and recreate the calculate_course_price function with correct TVA logic

DROP FUNCTION IF EXISTS public.calculate_course_price(uuid, numeric, integer, boolean);

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
  
  -- Calculs
  _base := COALESCE(_base_fare, 0);
  _distance := COALESCE(_distance_km * _per_km_rate, 0);
  
  -- Calcul temps : soit hourly_rate (par heure) soit inclus dans base
  IF _use_hourly_rate AND _hourly_rate IS NOT NULL THEN
    _time := (_duration_minutes / 60.0) * _hourly_rate;
  ELSE
    _time := 0;
  END IF;
  
  _sub := _base + _distance + _time;
  
  -- TVA automatique selon le type de course :
  -- 10% pour facturation au kilomètre (_use_hourly_rate = false)
  -- 20% pour mise à disposition / paiement horaire (_use_hourly_rate = true)
  IF _use_hourly_rate THEN
    _tva_rate := 20.0;  -- Mise à disposition (hourly)
  ELSE
    _tva_rate := 10.0;  -- Facturation au km
  END IF;
  
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

COMMENT ON FUNCTION public.calculate_course_price IS 'Calcule le prix d''une course avec TVA automatique : 10% pour courses au km, 20% pour mises à disposition (hourly)';