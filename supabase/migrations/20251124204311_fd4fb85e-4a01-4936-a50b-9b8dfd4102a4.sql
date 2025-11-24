-- Ajouter les colonnes pour les augmentations soir et weekend
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS evening_surcharge numeric DEFAULT 0 CHECK (evening_surcharge >= 0 AND evening_surcharge <= 100),
ADD COLUMN IF NOT EXISTS weekend_surcharge numeric DEFAULT 0 CHECK (weekend_surcharge >= 0 AND weekend_surcharge <= 100);

COMMENT ON COLUMN public.drivers.evening_surcharge IS 'Augmentation en pourcentage pour les courses du soir (0-100%)';
COMMENT ON COLUMN public.drivers.weekend_surcharge IS 'Augmentation en pourcentage pour les courses du weekend (0-100%)';

-- Mettre à jour la fonction calculate_course_price pour inclure les augmentations
CREATE OR REPLACE FUNCTION calculate_course_price(
  _driver_id uuid,
  _distance_km numeric,
  _duration_minutes integer,
  _use_hourly_rate boolean DEFAULT false,
  _scheduled_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
  base_price numeric,
  distance_price numeric,
  time_price numeric,
  subtotal numeric,
  tva_amount numeric,
  total_price numeric,
  surcharge_evening numeric,
  surcharge_weekend numeric
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_fare numeric;
  v_per_km_rate numeric;
  v_hourly_rate numeric;
  v_tva_rate numeric;
  v_tva_included boolean;
  v_evening_surcharge numeric;
  v_weekend_surcharge numeric;
  v_subtotal numeric;
  v_tva numeric;
  v_evening_amount numeric := 0;
  v_weekend_amount numeric := 0;
  v_is_evening boolean := false;
  v_is_weekend boolean := false;
  v_hour integer;
  v_day_of_week integer;
BEGIN
  -- Récupérer les tarifs du chauffeur
  SELECT 
    COALESCE(d.base_fare, 0),
    COALESCE(d.per_km_rate, 0),
    COALESCE(d.hourly_rate, 0),
    COALESCE(d.tva_rate, 20),
    COALESCE(d.tva_included, false),
    COALESCE(d.evening_surcharge, 0),
    COALESCE(d.weekend_surcharge, 0)
  INTO 
    v_base_fare,
    v_per_km_rate,
    v_hourly_rate,
    v_tva_rate,
    v_tva_included,
    v_evening_surcharge,
    v_weekend_surcharge
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
    -- Mise à disposition (tarif horaire)
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
  v_subtotal := base_price + distance_price + time_price;

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
$$;