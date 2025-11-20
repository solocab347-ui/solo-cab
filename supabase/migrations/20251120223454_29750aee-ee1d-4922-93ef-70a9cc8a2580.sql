-- Add max_passengers and tva_included fields to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS max_passengers INTEGER DEFAULT 4 NOT NULL,
ADD COLUMN IF NOT EXISTS tva_included BOOLEAN DEFAULT false NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.drivers.max_passengers IS 'Maximum number of passengers the driver can transport (default 4 for standard VTC, can be increased for vans)';
COMMENT ON COLUMN public.drivers.tva_included IS 'Whether the rates (per_km_rate, hourly_rate, base_fare) already include VAT or not';

-- Update calculate_course_price function to handle tva_included
CREATE OR REPLACE FUNCTION public.calculate_course_price(
  _driver_id uuid,
  _distance_km numeric,
  _duration_minutes integer,
  _use_hourly_rate boolean DEFAULT false
)
RETURNS TABLE(
  base_price numeric,
  distance_price numeric,
  time_price numeric,
  subtotal numeric,
  tva_amount numeric,
  total_price numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _base_fare DECIMAL;
  _per_km_rate DECIMAL;
  _hourly_rate DECIMAL;
  _tva_rate DECIMAL;
  _tva_included BOOLEAN;
  _base DECIMAL;
  _distance DECIMAL;
  _time DECIMAL;
  _sub DECIMAL;
  _tva DECIMAL;
  _total DECIMAL;
  _base_ht DECIMAL;
  _distance_ht DECIMAL;
  _time_ht DECIMAL;
BEGIN
  -- Récupérer les tarifs du chauffeur et le paramètre tva_included
  SELECT 
    d.base_fare,
    d.per_km_rate,
    d.hourly_rate,
    d.tva_rate,
    d.tva_included
  INTO 
    _base_fare,
    _per_km_rate,
    _hourly_rate,
    _tva_rate,
    _tva_included
  FROM public.drivers d
  WHERE d.id = _driver_id;
  
  -- Calculs selon le type de course
  IF _use_hourly_rate THEN
    -- MISE À DISPOSITION : uniquement prix horaire
    _time := (_duration_minutes / 60.0) * COALESCE(_hourly_rate, 0);
    _tva_rate := 20.0;  -- 20% TVA pour mise à disposition
    
    -- Si TVA comprise, calculer le HT
    IF _tva_included THEN
      _time_ht := _time / (1 + _tva_rate / 100.0);
      _base := 0;
      _distance := 0;
      _sub := _time_ht;
    ELSE
      _base := 0;
      _distance := 0;
      _sub := _time;
    END IF;
  ELSE
    -- COURSE CLASSIQUE : base + distance
    _base := COALESCE(_base_fare, 0);
    _distance := COALESCE(_distance_km * _per_km_rate, 0);
    _time := 0;
    _tva_rate := 10.0;  -- 10% TVA pour facturation au km
    
    -- Si TVA comprise, calculer le HT
    IF _tva_included THEN
      _base_ht := _base / (1 + _tva_rate / 100.0);
      _distance_ht := _distance / (1 + _tva_rate / 100.0);
      _sub := _base_ht + _distance_ht;
      _base := _base_ht;
      _distance := _distance_ht;
    ELSE
      _sub := _base + _distance;
    END IF;
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
$function$;