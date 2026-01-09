CREATE OR REPLACE FUNCTION calculate_fleet_course_price(
  p_fleet_manager_id UUID,
  p_distance_km NUMERIC,
  p_duration_minutes NUMERIC,
  p_use_hourly_rate BOOLEAN DEFAULT false,
  p_scheduled_date TIMESTAMP DEFAULT NULL,
  p_pickup_city TEXT DEFAULT NULL,
  p_destination_city TEXT DEFAULT NULL
)
RETURNS TABLE (
  base_price NUMERIC,
  distance_price NUMERIC,
  time_price NUMERIC,
  subtotal NUMERIC,
  tva_amount NUMERIC,
  total_price NUMERIC,
  surcharge_evening NUMERIC,
  surcharge_weekend NUMERIC,
  pricing_source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fm RECORD;
  v_city_pricing RECORD;
  v_city_pricing_found BOOLEAN := false;
  v_base NUMERIC := 0;
  v_distance NUMERIC := 0;
  v_time NUMERIC := 0;
  v_subtotal NUMERIC := 0;
  v_tva NUMERIC := 0;
  v_total NUMERIC := 0;
  v_evening NUMERIC := 0;
  v_weekend NUMERIC := 0;
  v_is_evening BOOLEAN := false;
  v_is_weekend BOOLEAN := false;
  v_hour INTEGER;
  v_day_of_week INTEGER;
  v_tva_rate NUMERIC := 10;
  v_tva_included BOOLEAN := false;
  v_pricing_source TEXT := 'general';
BEGIN
  -- Get fleet manager pricing data
  SELECT * INTO v_fm FROM fleet_managers WHERE id = p_fleet_manager_id;
  
  IF v_fm IS NULL THEN
    RAISE EXCEPTION 'Fleet manager not found';
  END IF;

  -- Check for city pricing
  IF p_pickup_city IS NOT NULL AND p_destination_city IS NOT NULL 
     AND LOWER(p_pickup_city) = LOWER(p_destination_city) THEN
    SELECT * INTO v_city_pricing 
    FROM city_pricing 
    WHERE fleet_manager_id = p_fleet_manager_id 
      AND is_active = true 
      AND LOWER(city_name) = LOWER(p_pickup_city)
    ORDER BY priority DESC
    LIMIT 1;
    
    IF FOUND THEN
      v_city_pricing_found := true;
    END IF;
  END IF;

  -- Determine time-based surcharges
  IF p_scheduled_date IS NOT NULL THEN
    v_hour := EXTRACT(HOUR FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    v_day_of_week := EXTRACT(DOW FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    v_is_evening := (v_hour >= 20 OR v_hour < 6);
    v_is_weekend := (v_day_of_week = 0 OR v_day_of_week = 6);
  END IF;

  -- Use city pricing if found
  IF v_city_pricing_found THEN
    v_pricing_source := 'city';
    v_tva_included := COALESCE(v_city_pricing.tva_included, false);
    v_tva_rate := COALESCE(v_city_pricing.tva_rate, 10);
    
    IF v_city_pricing.pricing_type = 'hourly' OR p_use_hourly_rate THEN
      v_time := COALESCE(v_city_pricing.hourly_rate, 0) * (p_duration_minutes / 60.0);
    ELSE
      v_base := COALESCE(v_city_pricing.base_fare, 0);
      v_distance := COALESCE(v_city_pricing.per_km_rate, 0) * p_distance_km;
    END IF;
    
    v_subtotal := v_base + v_distance + v_time;
    
    -- Apply minimum price
    IF COALESCE(v_city_pricing.minimum_price, 0) > 0 AND v_subtotal < v_city_pricing.minimum_price THEN
      v_subtotal := v_city_pricing.minimum_price;
      v_distance := v_subtotal - v_base;
    END IF;
    
    -- Apply surcharges from city pricing
    IF v_is_evening AND COALESCE(v_city_pricing.evening_surcharge, 0) > 0 THEN
      v_evening := v_subtotal * (v_city_pricing.evening_surcharge / 100);
      v_subtotal := v_subtotal + v_evening;
    END IF;
    
    IF v_is_weekend AND COALESCE(v_city_pricing.weekend_surcharge, 0) > 0 THEN
      v_weekend := v_subtotal * (v_city_pricing.weekend_surcharge / 100);
      v_subtotal := v_subtotal + v_weekend;
    END IF;
  ELSE
    -- Use general fleet manager pricing
    v_pricing_source := 'general';
    v_tva_included := COALESCE(v_fm.tva_included, false);
    v_tva_rate := 10;
    
    IF p_use_hourly_rate AND COALESCE(v_fm.hourly_rate, 0) > 0 THEN
      v_time := v_fm.hourly_rate * (p_duration_minutes / 60.0);
      v_tva_rate := 20;
    ELSE
      v_base := COALESCE(v_fm.base_fare, 0);
      v_distance := COALESCE(v_fm.per_km_rate, 0) * p_distance_km;
    END IF;
    
    v_subtotal := v_base + v_distance + v_time;
    
    -- Apply minimum price
    IF COALESCE(v_fm.minimum_price, 0) > 0 AND v_subtotal < v_fm.minimum_price THEN
      v_subtotal := v_fm.minimum_price;
      v_distance := v_subtotal - v_base;
    END IF;
    
    -- Apply surcharges
    IF v_is_evening AND COALESCE(v_fm.evening_surcharge, 0) > 0 THEN
      v_evening := v_subtotal * (v_fm.evening_surcharge / 100);
      v_subtotal := v_subtotal + v_evening;
    END IF;
    
    IF v_is_weekend AND COALESCE(v_fm.weekend_surcharge, 0) > 0 THEN
      v_weekend := v_subtotal * (v_fm.weekend_surcharge / 100);
      v_subtotal := v_subtotal + v_weekend;
    END IF;
  END IF;

  -- Calculate TVA
  IF v_tva_included THEN
    v_tva := v_subtotal - (v_subtotal / (1 + v_tva_rate / 100));
    v_total := v_subtotal;
  ELSE
    v_tva := v_subtotal * (v_tva_rate / 100);
    v_total := v_subtotal + v_tva;
  END IF;

  RETURN QUERY SELECT 
    v_base,
    v_distance,
    v_time,
    v_subtotal,
    v_tva,
    v_total,
    v_evening,
    v_weekend,
    v_pricing_source;
END;
$$;