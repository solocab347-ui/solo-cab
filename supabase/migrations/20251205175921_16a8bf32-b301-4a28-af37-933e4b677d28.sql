-- Ajouter la colonne prix minimum par course
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS minimum_price numeric DEFAULT 0;

COMMENT ON COLUMN public.drivers.minimum_price IS 'Prix minimum par course (au km). Si le calcul est inférieur, ce prix minimum est appliqué.';

-- Mettre à jour la fonction calculate_course_price pour prendre en compte le prix minimum
CREATE OR REPLACE FUNCTION public.calculate_course_price(_driver_id uuid, _distance_km numeric, _duration_minutes integer, _use_hourly_rate boolean DEFAULT false, _scheduled_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(base_price numeric, distance_price numeric, time_price numeric, subtotal numeric, tva_amount numeric, total_price numeric, surcharge_evening numeric, surcharge_weekend numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_base_fare numeric;
  v_per_km_rate numeric;
  v_hourly_rate numeric;
  v_tva_rate numeric;
  v_tva_included boolean;
  v_evening_surcharge numeric;
  v_weekend_surcharge numeric;
  v_minimum_price numeric;
  v_subtotal numeric;
  v_tva numeric;
  v_evening_amount numeric := 0;
  v_weekend_amount numeric := 0;
  v_is_evening boolean := false;
  v_is_weekend boolean := false;
  v_hour integer;
  v_day_of_week integer;
  v_calculated_subtotal numeric;
BEGIN
  -- Récupérer les tarifs du chauffeur
  SELECT 
    COALESCE(d.base_fare, 0),
    COALESCE(d.per_km_rate, 0),
    COALESCE(d.hourly_rate, 0),
    COALESCE(d.tva_rate, 20),
    COALESCE(d.tva_included, false),
    COALESCE(d.evening_surcharge, 0),
    COALESCE(d.weekend_surcharge, 0),
    COALESCE(d.minimum_price, 0)
  INTO 
    v_base_fare,
    v_per_km_rate,
    v_hourly_rate,
    v_tva_rate,
    v_tva_included,
    v_evening_surcharge,
    v_weekend_surcharge,
    v_minimum_price
  FROM drivers d
  WHERE d.id = _driver_id;

  -- Déterminer si c'est le soir ou le weekend (si date fournie)
  IF _scheduled_date IS NOT NULL THEN
    v_hour := EXTRACT(HOUR FROM _scheduled_date AT TIME ZONE 'Europe/Paris');
    v_day_of_week := EXTRACT(DOW FROM _scheduled_date AT TIME ZONE 'Europe/Paris');
    
    -- Soir : entre 20h (20:00) et 6h (06:00)
    v_is_evening := (v_hour >= 20 OR v_hour < 6);
    
    -- Weekend : samedi (6) ou dimanche (0)
    v_is_weekend := (v_day_of_week = 0 OR v_day_of_week = 6);
  END IF;

  -- Calcul selon le type de course
  IF _use_hourly_rate THEN
    -- Mise à disposition (tarif horaire) - PAS de prix minimum
    base_price := 0;
    distance_price := 0;
    time_price := v_hourly_rate * (_duration_minutes / 60.0);
    v_tva_rate := 20; -- TVA 20% pour mise à disposition
  ELSE
    -- Course classique (au kilomètre)
    base_price := v_base_fare;
    distance_price := v_per_km_rate * _distance_km;
    time_price := 0;
    v_tva_rate := 10; -- TVA 10% pour facturation au km
  END IF;

  -- Calcul du sous-total avant augmentations
  v_calculated_subtotal := base_price + distance_price + time_price;

  -- APPLIQUER LE PRIX MINIMUM (uniquement pour courses au km, pas mise à disposition)
  IF NOT _use_hourly_rate AND v_minimum_price > 0 AND v_calculated_subtotal < v_minimum_price THEN
    -- Ajuster pour atteindre le prix minimum
    -- On met tout dans distance_price pour refléter le prix minimum
    distance_price := v_minimum_price - base_price;
    IF distance_price < 0 THEN
      distance_price := 0;
      base_price := v_minimum_price;
    END IF;
    v_calculated_subtotal := v_minimum_price;
  END IF;

  v_subtotal := v_calculated_subtotal;

  -- Appliquer les augmentations si applicable
  IF v_is_evening AND v_evening_surcharge > 0 THEN
    v_evening_amount := v_subtotal * (v_evening_surcharge / 100);
    v_subtotal := v_subtotal + v_evening_amount;
  END IF;

  IF v_is_weekend AND v_weekend_surcharge > 0 THEN
    v_weekend_amount := v_subtotal * (v_weekend_surcharge / 100);
    v_subtotal := v_subtotal + v_weekend_amount;
  END IF;

  subtotal := v_subtotal;

  -- Calculer la TVA
  IF v_tva_included THEN
    -- TVA comprise dans le prix
    v_tva := v_subtotal - (v_subtotal / (1 + v_tva_rate / 100));
  ELSE
    -- TVA non comprise
    v_tva := v_subtotal * (v_tva_rate / 100);
  END IF;

  tva_amount := v_tva;
  total_price := v_subtotal + (CASE WHEN v_tva_included THEN 0 ELSE v_tva END);
  surcharge_evening := v_evening_amount;
  surcharge_weekend := v_weekend_amount;

  RETURN QUERY SELECT 
    base_price,
    distance_price,
    time_price,
    subtotal,
    tva_amount,
    total_price,
    surcharge_evening,
    surcharge_weekend;
END;
$function$;