
-- Supprimer et recréer la fonction avec peak hours
DROP FUNCTION IF EXISTS public.calculate_fleet_course_price(uuid, numeric, numeric, boolean, timestamptz, text, text);

CREATE OR REPLACE FUNCTION public.calculate_fleet_course_price(
  p_fleet_manager_id UUID,
  p_distance_km NUMERIC,
  p_duration_minutes NUMERIC,
  p_use_hourly_rate BOOLEAN DEFAULT false,
  p_scheduled_date TIMESTAMPTZ DEFAULT NULL,
  p_pickup_city TEXT DEFAULT NULL,
  p_destination_city TEXT DEFAULT NULL
)
RETURNS TABLE(
  base_price NUMERIC, distance_price NUMERIC, time_price NUMERIC, subtotal NUMERIC,
  tva_amount NUMERIC, total_price NUMERIC, surcharge_evening NUMERIC, surcharge_weekend NUMERIC,
  peak_hours_surcharge NUMERIC, pricing_source TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_fm RECORD; v_city_pricing RECORD; v_city_pricing_found BOOLEAN := false;
  v_base NUMERIC := 0; v_distance NUMERIC := 0; v_time NUMERIC := 0;
  v_subtotal NUMERIC := 0; v_tva NUMERIC := 0; v_total NUMERIC := 0;
  v_evening NUMERIC := 0; v_weekend NUMERIC := 0; v_peak_hours NUMERIC := 0;
  v_is_evening BOOLEAN := false; v_is_weekend BOOLEAN := false;
  v_hour INTEGER; v_day_of_week INTEGER; v_tva_rate NUMERIC := 10; v_tva_included BOOLEAN := false;
  v_pricing_source TEXT := 'general'; v_current_time TIME;
BEGIN
  SELECT * INTO v_fm FROM fleet_managers WHERE id = p_fleet_manager_id;
  IF v_fm IS NULL THEN RAISE EXCEPTION 'Fleet manager not found'; END IF;

  IF p_pickup_city IS NOT NULL AND p_destination_city IS NOT NULL 
     AND LOWER(TRIM(p_pickup_city)) = LOWER(TRIM(p_destination_city)) THEN
    SELECT * INTO v_city_pricing FROM city_pricing 
    WHERE fleet_manager_id = p_fleet_manager_id AND is_active = true AND LOWER(city_name) = LOWER(TRIM(p_pickup_city))
    ORDER BY priority DESC LIMIT 1;
    IF FOUND THEN v_city_pricing_found := true; END IF;
  END IF;

  IF p_scheduled_date IS NOT NULL THEN
    v_hour := EXTRACT(HOUR FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    v_day_of_week := EXTRACT(DOW FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    v_current_time := (p_scheduled_date AT TIME ZONE 'Europe/Paris')::TIME;
    v_is_evening := (v_hour >= 20 OR v_hour < 6);
    v_is_weekend := (v_day_of_week = 0 OR v_day_of_week = 6);
  END IF;

  IF v_city_pricing_found THEN
    v_pricing_source := 'city';
    v_tva_included := COALESCE(v_city_pricing.tva_included, false);
    v_tva_rate := COALESCE(v_city_pricing.tva_rate, 10);
    v_base := COALESCE(v_city_pricing.base_fare, 0);
    v_distance := COALESCE(v_city_pricing.per_km_rate, 0) * p_distance_km;
    v_subtotal := v_base + v_distance;
    
    IF COALESCE(v_city_pricing.minimum_price, 0) > 0 AND v_subtotal < v_city_pricing.minimum_price THEN
      v_subtotal := v_city_pricing.minimum_price; v_distance := v_subtotal - v_base;
    END IF;
    
    -- Peak hours check
    IF v_city_pricing.peak_hours_enabled = true AND p_scheduled_date IS NOT NULL AND v_current_time IS NOT NULL THEN
      IF v_current_time >= v_city_pricing.peak_hours_start::TIME AND v_current_time <= v_city_pricing.peak_hours_end::TIME THEN
        v_peak_hours := v_subtotal * (COALESCE(v_city_pricing.peak_hours_multiplier, 1) - 1);
        v_subtotal := v_subtotal + v_peak_hours;
      END IF;
    END IF;
    
    IF v_is_evening AND COALESCE(v_city_pricing.evening_surcharge, 0) > 0 THEN
      v_evening := v_subtotal * (v_city_pricing.evening_surcharge / 100); v_subtotal := v_subtotal + v_evening;
    END IF;
    IF v_is_weekend AND COALESCE(v_city_pricing.weekend_surcharge, 0) > 0 THEN
      v_weekend := v_subtotal * (v_city_pricing.weekend_surcharge / 100); v_subtotal := v_subtotal + v_weekend;
    END IF;
  ELSE
    v_pricing_source := 'general'; v_tva_included := COALESCE(v_fm.tva_included, false);
    v_base := COALESCE(v_fm.base_fare, 0); v_distance := COALESCE(v_fm.per_km_rate, 0) * p_distance_km;
    v_subtotal := v_base + v_distance;
    IF COALESCE(v_fm.minimum_price, 0) > 0 AND v_subtotal < v_fm.minimum_price THEN
      v_subtotal := v_fm.minimum_price; v_distance := v_subtotal - v_base;
    END IF;
    IF v_is_evening AND COALESCE(v_fm.evening_surcharge, 0) > 0 THEN
      v_evening := v_subtotal * (v_fm.evening_surcharge / 100); v_subtotal := v_subtotal + v_evening;
    END IF;
    IF v_is_weekend AND COALESCE(v_fm.weekend_surcharge, 0) > 0 THEN
      v_weekend := v_subtotal * (v_fm.weekend_surcharge / 100); v_subtotal := v_subtotal + v_weekend;
    END IF;
  END IF;

  IF v_tva_included THEN v_tva := v_subtotal - (v_subtotal / (1 + v_tva_rate / 100)); v_total := v_subtotal;
  ELSE v_tva := v_subtotal * (v_tva_rate / 100); v_total := v_subtotal + v_tva; END IF;

  RETURN QUERY SELECT ROUND(v_base,2), ROUND(v_distance,2), ROUND(v_time,2), ROUND(v_subtotal,2),
    ROUND(v_tva,2), ROUND(v_total,2), ROUND(v_evening,2), ROUND(v_weekend,2), ROUND(v_peak_hours,2), v_pricing_source;
END;
$$;
