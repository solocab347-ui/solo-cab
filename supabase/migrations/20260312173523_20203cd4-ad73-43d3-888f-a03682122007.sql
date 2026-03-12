
-- Add custom evening time slots to city_pricing
ALTER TABLE public.city_pricing
ADD COLUMN IF NOT EXISTS evening_start TIME DEFAULT '20:00',
ADD COLUMN IF NOT EXISTS evening_end TIME DEFAULT '06:00';

COMMENT ON COLUMN public.city_pricing.evening_start IS 'Début du créneau soirée pour cette ville (défaut 20h)';
COMMENT ON COLUMN public.city_pricing.evening_end IS 'Fin du créneau soirée pour cette ville (défaut 6h)';

-- Update calculate_city_course_price to use MAX(driver, city) surcharges and custom time slots
CREATE OR REPLACE FUNCTION public.calculate_city_course_price(
  p_city_pricing_id uuid, 
  p_distance_km numeric, 
  p_duration_minutes integer, 
  p_scheduled_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  base_price numeric, 
  distance_price numeric, 
  time_price numeric, 
  subtotal numeric, 
  tva_amount numeric, 
  total_price numeric, 
  surcharge_evening numeric, 
  surcharge_weekend numeric, 
  peak_adjustment numeric, 
  off_peak_discount numeric
)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_pricing RECORD;
  v_driver RECORD;
  v_base_price NUMERIC := 0;
  v_distance_price NUMERIC := 0;
  v_time_price NUMERIC := 0;
  v_subtotal NUMERIC := 0;
  v_tva NUMERIC := 0;
  v_evening_amount NUMERIC := 0;
  v_weekend_amount NUMERIC := 0;
  v_peak_amount NUMERIC := 0;
  v_off_peak_amount NUMERIC := 0;
  v_is_evening BOOLEAN := false;
  v_is_weekend BOOLEAN := false;
  v_is_peak BOOLEAN := false;
  v_is_off_peak BOOLEAN := false;
  v_hour INTEGER;
  v_time TIME;
  v_day_of_week INTEGER;
  v_effective_evening_surcharge NUMERIC := 0;
  v_effective_weekend_surcharge NUMERIC := 0;
  v_evening_start TIME;
  v_evening_end TIME;
BEGIN
  -- Get city pricing
  SELECT * INTO v_pricing FROM city_pricing cp WHERE cp.id = p_city_pricing_id;
  
  IF v_pricing IS NULL THEN
    RAISE EXCEPTION 'City pricing not found';
  END IF;

  -- Get driver's base surcharges for MAX comparison
  IF v_pricing.driver_id IS NOT NULL THEN
    SELECT COALESCE(d.evening_surcharge, 0) AS evening_surcharge,
           COALESCE(d.weekend_surcharge, 0) AS weekend_surcharge
    INTO v_driver
    FROM drivers d WHERE d.id = v_pricing.driver_id;
  ELSIF v_pricing.fleet_manager_id IS NOT NULL THEN
    SELECT COALESCE(fm.evening_surcharge, 0) AS evening_surcharge,
           COALESCE(fm.weekend_surcharge, 0) AS weekend_surcharge
    INTO v_driver
    FROM fleet_managers fm WHERE fm.id = v_pricing.fleet_manager_id;
  END IF;

  -- Use MAX between driver's global surcharges and city-specific surcharges
  v_effective_evening_surcharge := GREATEST(
    COALESCE(v_pricing.evening_surcharge, 0),
    COALESCE(v_driver.evening_surcharge, 0)
  );
  v_effective_weekend_surcharge := GREATEST(
    COALESCE(v_pricing.weekend_surcharge, 0),
    COALESCE(v_driver.weekend_surcharge, 0)
  );

  -- Use custom evening time slots (with defaults 20:00-06:00)
  v_evening_start := COALESCE(v_pricing.evening_start, '20:00'::TIME);
  v_evening_end := COALESCE(v_pricing.evening_end, '06:00'::TIME);
  
  IF p_scheduled_date IS NOT NULL THEN
    v_hour := EXTRACT(HOUR FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    v_time := (p_scheduled_date AT TIME ZONE 'Europe/Paris')::TIME;
    v_day_of_week := EXTRACT(DOW FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    
    -- Custom evening detection using configurable time slots
    IF v_evening_start > v_evening_end THEN
      -- Overnight range (e.g., 20:00-06:00)
      v_is_evening := (v_time >= v_evening_start OR v_time < v_evening_end);
    ELSE
      -- Same-day range
      v_is_evening := (v_time >= v_evening_start AND v_time < v_evening_end);
    END IF;
    
    v_is_weekend := (v_day_of_week = 0 OR v_day_of_week = 6);
    
    -- Peak hours detection (unchanged)
    IF v_pricing.peak_hours_enabled AND v_pricing.peak_hours_start IS NOT NULL AND v_pricing.peak_hours_end IS NOT NULL THEN
      IF v_pricing.peak_hours_start < v_pricing.peak_hours_end THEN
        v_is_peak := v_time >= v_pricing.peak_hours_start AND v_time <= v_pricing.peak_hours_end;
      ELSE
        v_is_peak := v_time >= v_pricing.peak_hours_start OR v_time <= v_pricing.peak_hours_end;
      END IF;
    END IF;
    
    IF v_pricing.off_peak_enabled AND v_pricing.off_peak_start IS NOT NULL AND v_pricing.off_peak_end IS NOT NULL THEN
      IF v_pricing.off_peak_start < v_pricing.off_peak_end THEN
        v_is_off_peak := v_time >= v_pricing.off_peak_start AND v_time <= v_pricing.off_peak_end;
      ELSE
        v_is_off_peak := v_time >= v_pricing.off_peak_start OR v_time <= v_pricing.off_peak_end;
      END IF;
    END IF;
  END IF;
  
  -- Calculate base pricing
  IF v_pricing.pricing_type = 'hourly' THEN
    v_base_price := 0;
    v_distance_price := 0;
    v_time_price := v_pricing.hourly_rate * (p_duration_minutes / 60.0);
  ELSE
    v_base_price := v_pricing.base_fare;
    v_distance_price := v_pricing.per_km_rate * p_distance_km;
    v_time_price := 0;
  END IF;
  
  v_subtotal := v_base_price + v_distance_price + v_time_price;
  
  -- Minimum price
  IF v_pricing.minimum_price > 0 AND v_subtotal < v_pricing.minimum_price THEN
    v_distance_price := v_pricing.minimum_price - v_base_price;
    IF v_distance_price < 0 THEN
      v_distance_price := 0;
      v_base_price := v_pricing.minimum_price;
    END IF;
    v_subtotal := v_pricing.minimum_price;
  END IF;
  
  -- Peak hours
  IF v_is_peak AND v_pricing.peak_hours_multiplier > 1.0 THEN
    v_peak_amount := v_subtotal * (v_pricing.peak_hours_multiplier - 1.0);
    v_subtotal := v_subtotal + v_peak_amount;
  END IF;
  
  -- Off-peak discount
  IF NOT v_is_peak AND v_is_off_peak AND v_pricing.off_peak_discount > 0 THEN
    v_off_peak_amount := v_subtotal * (v_pricing.off_peak_discount / 100);
    v_subtotal := v_subtotal - v_off_peak_amount;
  END IF;
  
  -- Apply MAX evening surcharge
  IF v_is_evening AND v_effective_evening_surcharge > 0 THEN
    v_evening_amount := v_subtotal * (v_effective_evening_surcharge / 100);
    v_subtotal := v_subtotal + v_evening_amount;
  END IF;
  
  -- Apply MAX weekend surcharge
  IF v_is_weekend AND v_effective_weekend_surcharge > 0 THEN
    v_weekend_amount := v_subtotal * (v_effective_weekend_surcharge / 100);
    v_subtotal := v_subtotal + v_weekend_amount;
  END IF;
  
  -- TVA
  IF v_pricing.tva_included THEN
    v_tva := v_subtotal - (v_subtotal / (1 + v_pricing.tva_rate / 100));
  ELSE
    v_tva := v_subtotal * (v_pricing.tva_rate / 100);
  END IF;
  
  base_price := v_base_price;
  distance_price := v_distance_price;
  time_price := v_time_price;
  subtotal := v_subtotal;
  tva_amount := v_tva;
  total_price := v_subtotal + (CASE WHEN v_pricing.tva_included THEN 0 ELSE v_tva END);
  surcharge_evening := v_evening_amount;
  surcharge_weekend := v_weekend_amount;
  peak_adjustment := v_peak_amount;
  off_peak_discount := v_off_peak_amount;
  
  RETURN NEXT;
END;
$function$;
