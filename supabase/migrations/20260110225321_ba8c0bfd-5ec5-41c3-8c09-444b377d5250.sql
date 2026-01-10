
-- Supprimer et recréer calculate_course_price avec city pricing intégré
DROP FUNCTION IF EXISTS public.calculate_course_price(uuid, numeric, integer, boolean, timestamptz, text, text);

CREATE OR REPLACE FUNCTION public.calculate_course_price(
  _driver_id UUID,
  _distance_km NUMERIC,
  _duration_minutes INTEGER,
  _use_hourly_rate BOOLEAN DEFAULT false,
  _scheduled_date TIMESTAMPTZ DEFAULT NULL,
  _pickup_address TEXT DEFAULT NULL,
  _destination_address TEXT DEFAULT NULL
)
RETURNS TABLE(
  base_price NUMERIC, distance_price NUMERIC, time_price NUMERIC, subtotal NUMERIC,
  tva_amount NUMERIC, total_price NUMERIC, surcharge_evening NUMERIC, surcharge_weekend NUMERIC,
  airport_fee NUMERIC, peak_hours_surcharge NUMERIC, pricing_source TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pricing_result RECORD; v_city_result RECORD;
  v_base_fare NUMERIC; v_per_km_rate NUMERIC; v_hourly_rate NUMERIC; v_tva_rate NUMERIC;
  v_tva_included BOOLEAN; v_evening_surcharge NUMERIC; v_weekend_surcharge NUMERIC;
  v_minimum_price NUMERIC; v_airport_surcharge NUMERIC;
  v_subtotal NUMERIC; v_tva NUMERIC; v_evening_amount NUMERIC := 0; v_weekend_amount NUMERIC := 0;
  v_airport_amount NUMERIC := 0;
  v_is_evening BOOLEAN := false; v_is_weekend BOOLEAN := false; v_is_airport BOOLEAN := false;
  v_hour INTEGER; v_day_of_week INTEGER; v_calculated_subtotal NUMERIC;
BEGIN
  -- 1. Vérifier si une tarification par ville s'applique
  FOR v_pricing_result IN
    SELECT * FROM public.get_applicable_pricing(_driver_id, _pickup_address, _destination_address)
  LOOP
    IF v_pricing_result.pricing_type = 'city' AND v_pricing_result.city_pricing_id IS NOT NULL THEN
      FOR v_city_result IN
        SELECT * FROM public.calculate_city_course_price(
          v_pricing_result.city_pricing_id, _distance_km, _duration_minutes, _scheduled_date)
      LOOP
        RETURN QUERY SELECT 
          v_city_result.base_price, v_city_result.distance_price, v_city_result.time_price,
          v_city_result.subtotal, v_city_result.tva_amount, v_city_result.total_price,
          v_city_result.surcharge_evening, v_city_result.surcharge_weekend, 0::NUMERIC,
          v_city_result.peak_adjustment, 'city'::TEXT;
        RETURN;
      END LOOP;
    END IF;
  END LOOP;
  
  -- 2. Tarification classique
  SELECT COALESCE(d.base_fare,0), COALESCE(d.per_km_rate,0), COALESCE(d.hourly_rate,0),
    COALESCE(d.tva_rate,10), COALESCE(d.tva_included,true), COALESCE(d.evening_surcharge,0),
    COALESCE(d.weekend_surcharge,0), COALESCE(d.minimum_price,0), COALESCE(d.airport_surcharge,0)
  INTO v_base_fare, v_per_km_rate, v_hourly_rate, v_tva_rate, v_tva_included,
    v_evening_surcharge, v_weekend_surcharge, v_minimum_price, v_airport_surcharge
  FROM drivers d WHERE d.id = _driver_id;

  IF _scheduled_date IS NOT NULL THEN
    v_hour := EXTRACT(HOUR FROM _scheduled_date AT TIME ZONE 'Europe/Paris');
    v_day_of_week := EXTRACT(DOW FROM _scheduled_date AT TIME ZONE 'Europe/Paris');
    v_is_evening := (v_hour >= 20 OR v_hour < 6);
    v_is_weekend := (v_day_of_week = 0 OR v_day_of_week = 6);
  END IF;

  IF (_pickup_address IS NOT NULL AND public.is_airport_address(_pickup_address)) OR
     (_destination_address IS NOT NULL AND public.is_airport_address(_destination_address)) THEN
    v_is_airport := true; v_airport_amount := v_airport_surcharge;
  END IF;

  IF _use_hourly_rate THEN
    base_price := 0; distance_price := 0;
    time_price := v_hourly_rate * (_duration_minutes / 60.0); v_tva_rate := 20;
  ELSE
    base_price := v_base_fare; distance_price := v_per_km_rate * _distance_km; time_price := 0;
  END IF;

  v_calculated_subtotal := base_price + distance_price + time_price;

  IF NOT _use_hourly_rate AND v_minimum_price > 0 AND v_calculated_subtotal < v_minimum_price THEN
    distance_price := v_minimum_price - base_price;
    IF distance_price < 0 THEN distance_price := 0; base_price := v_minimum_price; END IF;
    v_calculated_subtotal := v_minimum_price;
  END IF;

  v_subtotal := v_calculated_subtotal;
  IF v_is_airport AND v_airport_amount > 0 THEN v_subtotal := v_subtotal + v_airport_amount; END IF;
  IF v_is_evening AND v_evening_surcharge > 0 THEN
    v_evening_amount := v_subtotal * (v_evening_surcharge / 100); v_subtotal := v_subtotal + v_evening_amount;
  END IF;
  IF v_is_weekend AND v_weekend_surcharge > 0 THEN
    v_weekend_amount := v_subtotal * (v_weekend_surcharge / 100); v_subtotal := v_subtotal + v_weekend_amount;
  END IF;

  subtotal := v_subtotal;
  IF v_tva_included THEN v_tva := v_subtotal - (v_subtotal / (1 + v_tva_rate / 100));
  ELSE v_tva := v_subtotal * (v_tva_rate / 100); END IF;

  tva_amount := v_tva;
  total_price := v_subtotal + (CASE WHEN v_tva_included THEN 0 ELSE v_tva END);

  RETURN QUERY SELECT base_price, distance_price, time_price, subtotal, tva_amount, total_price, 
    v_evening_amount, v_weekend_amount, v_airport_amount, 0::NUMERIC, 'classic'::TEXT;
END;
$$;
