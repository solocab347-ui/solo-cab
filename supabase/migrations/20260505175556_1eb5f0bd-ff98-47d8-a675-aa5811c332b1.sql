DROP FUNCTION IF EXISTS public.find_nearby_drivers(double precision, double precision, integer, double precision, text, uuid[], uuid);
DROP FUNCTION IF EXISTS public.find_nearby_drivers(double precision, double precision, integer, double precision, text);
DROP FUNCTION IF EXISTS public.calculate_course_price(uuid, numeric, integer, boolean, timestamp with time zone, text, text);

CREATE OR REPLACE FUNCTION public.find_nearby_drivers(
  p_latitude double precision,
  p_longitude double precision,
  p_limit integer DEFAULT 10,
  p_max_radius_km double precision DEFAULT 20,
  p_mode text DEFAULT 'reservation'::text,
  p_favorite_driver_ids uuid[] DEFAULT '{}'::uuid[],
  p_exclusive_driver_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  driver_id uuid,
  company_name text,
  display_name text,
  profile_photo_url text,
  base_fare numeric,
  per_km_rate numeric,
  minimum_price numeric,
  distance_meters double precision,
  search_radius_used integer,
  latitude double precision,
  longitude double precision,
  is_live_location boolean,
  vehicle_brand text,
  vehicle_model text,
  vehicle_color text,
  stripe_connect_charges_enabled boolean,
  accepted_payment_methods text[],
  approach_enabled boolean,
  approach_per_km_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_requested_radius_m integer := GREATEST(5000, LEAST(COALESCE(p_max_radius_km, 20), 200) * 1000);
  v_mode text := lower(COALESCE(p_mode, 'reservation'));
  v_favorite_radius_m integer := 5000;
  v_safe_favorites uuid[] := COALESCE(p_favorite_driver_ids, '{}'::uuid[]);
BEGIN
  IF p_exclusive_driver_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      d.id AS driver_id,
      d.company_name,
      COALESCE(p.full_name, d.company_name, 'Chauffeur VTC') AS display_name,
      p.profile_photo_url,
      COALESCE(d.base_fare, 0)::numeric,
      COALESCE(d.per_km_rate, 0)::numeric,
      COALESCE(d.minimum_price, 0)::numeric,
      COALESCE(
        ST_DistanceSphere(
          ST_MakePoint(d.current_longitude::double precision, d.current_latitude::double precision),
          ST_MakePoint(p_longitude, p_latitude)
        ),
        0
      )::double precision AS distance_meters,
      v_requested_radius_m AS search_radius_used,
      d.current_latitude::double precision AS latitude,
      d.current_longitude::double precision AS longitude,
      (d.last_location_update > now() - interval '5 minutes') AS is_live_location,
      d.vehicle_brand,
      d.vehicle_model,
      d.vehicle_color,
      COALESCE(d.stripe_connect_charges_enabled, false) AS stripe_connect_charges_enabled,
      d.accepted_payment_methods,
      COALESCE(d.approach_enabled, false) AS approach_enabled,
      COALESCE(d.approach_per_km_rate, 0)::numeric AS approach_per_km_rate
    FROM public.drivers d
    LEFT JOIN public.profiles p ON p.id = d.user_id
    WHERE d.id = p_exclusive_driver_id
    LIMIT 1;
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidate_drivers AS (
    SELECT
      d.id,
      d.company_name,
      COALESCE(p.full_name, d.company_name, 'Chauffeur VTC') AS display_name,
      p.profile_photo_url,
      COALESCE(d.base_fare, 0) AS base_fare,
      COALESCE(d.per_km_rate, 0) AS per_km_rate,
      COALESCE(d.minimum_price, 0) AS minimum_price,
      d.vehicle_brand,
      d.vehicle_model,
      d.vehicle_color,
      COALESCE(d.stripe_connect_charges_enabled, false) AS stripe_connect_charges_enabled,
      d.accepted_payment_methods,
      COALESCE(d.approach_enabled, false) AS approach_enabled,
      COALESCE(d.approach_per_km_rate, 0)::numeric AS approach_per_km_rate,
      d.current_latitude::double precision AS candidate_latitude,
      d.current_longitude::double precision AS candidate_longitude,
      true AS is_live_location,
      (d.id = ANY(v_safe_favorites)) AS is_favorite
    FROM public.drivers d
    LEFT JOIN public.profiles p ON p.id = d.user_id
    WHERE d.public_profile_enabled = true
      AND COALESCE(d.is_demo_account, false) = false
      AND d.current_latitude IS NOT NULL
      AND d.current_longitude IS NOT NULL
      AND (
        (v_mode = 'immediate'
          AND d.is_available_now = true
          AND d.driver_status IN ('online', 'online_available')
          AND d.last_location_update > now() - interval '2 minutes')
        OR
        (v_mode = 'reservation'
          AND d.driver_status IN ('online', 'online_available')
          AND d.last_location_update > now() - interval '10 minutes'
          AND COALESCE(d.accept_future_bookings, true) = true)
      )
  ),
  ranked_drivers AS (
    SELECT
      cd.*,
      ST_DistanceSphere(
        ST_MakePoint(cd.candidate_longitude, cd.candidate_latitude),
        ST_MakePoint(p_longitude, p_latitude)
      ) AS dist_meters
    FROM candidate_drivers cd
    WHERE
      ST_DistanceSphere(
        ST_MakePoint(cd.candidate_longitude, cd.candidate_latitude),
        ST_MakePoint(p_longitude, p_latitude)
      ) <= v_requested_radius_m
      OR (
        cd.is_favorite
        AND ST_DistanceSphere(
          ST_MakePoint(cd.candidate_longitude, cd.candidate_latitude),
          ST_MakePoint(p_longitude, p_latitude)
        ) <= v_favorite_radius_m
      )
  )
  SELECT
    rd.id AS driver_id,
    rd.company_name,
    rd.display_name,
    rd.profile_photo_url,
    rd.base_fare,
    rd.per_km_rate,
    rd.minimum_price,
    rd.dist_meters AS distance_meters,
    v_requested_radius_m AS search_radius_used,
    rd.candidate_latitude AS latitude,
    rd.candidate_longitude AS longitude,
    rd.is_live_location,
    rd.vehicle_brand,
    rd.vehicle_model,
    rd.vehicle_color,
    rd.stripe_connect_charges_enabled,
    rd.accepted_payment_methods,
    rd.approach_enabled,
    rd.approach_per_km_rate
  FROM ranked_drivers rd
  ORDER BY
    (CASE WHEN rd.is_favorite THEN 0 ELSE 1 END) ASC,
    rd.dist_meters ASC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_course_price(
  _driver_id uuid,
  _distance_km numeric,
  _duration_minutes integer,
  _use_hourly_rate boolean DEFAULT false,
  _scheduled_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _pickup_address text DEFAULT NULL::text,
  _destination_address text DEFAULT NULL::text,
  _approach_distance_km numeric DEFAULT NULL,
  _is_immediate boolean DEFAULT false
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
  airport_fee numeric,
  peak_hours_surcharge numeric,
  pricing_source text,
  approach_fee numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pricing_result RECORD; v_city_result RECORD;
  v_base_fare NUMERIC; v_per_km_rate NUMERIC; v_hourly_rate NUMERIC; v_tva_rate NUMERIC;
  v_tva_included BOOLEAN; v_evening_surcharge NUMERIC; v_weekend_surcharge NUMERIC;
  v_minimum_price NUMERIC; v_airport_surcharge NUMERIC;
  v_approach_enabled BOOLEAN; v_approach_rate NUMERIC; v_approach_amount NUMERIC := 0;
  v_subtotal NUMERIC; v_tva NUMERIC; v_evening_amount NUMERIC := 0; v_weekend_amount NUMERIC := 0;
  v_airport_amount NUMERIC := 0;
  v_is_evening BOOLEAN := false; v_is_weekend BOOLEAN := false; v_is_airport BOOLEAN := false;
  v_hour INTEGER; v_day_of_week INTEGER; v_calculated_subtotal NUMERIC;
  v_total_with_approach NUMERIC;
BEGIN
  SELECT
    COALESCE(d.base_fare,0), COALESCE(d.per_km_rate,0), COALESCE(d.hourly_rate,0),
    COALESCE(d.tva_rate,10), COALESCE(d.tva_included,true), COALESCE(d.evening_surcharge,0),
    COALESCE(d.weekend_surcharge,0), COALESCE(d.minimum_price,0), COALESCE(d.airport_surcharge,0),
    COALESCE(d.approach_enabled,false), COALESCE(d.approach_per_km_rate,0)
  INTO v_base_fare, v_per_km_rate, v_hourly_rate, v_tva_rate, v_tva_included,
    v_evening_surcharge, v_weekend_surcharge, v_minimum_price, v_airport_surcharge,
    v_approach_enabled, v_approach_rate
  FROM drivers d WHERE d.id = _driver_id;

  IF _is_immediate
     AND v_approach_enabled
     AND NOT _use_hourly_rate
     AND _approach_distance_km IS NOT NULL
     AND _approach_distance_km > 2
     AND v_approach_rate > 0 THEN
    v_approach_amount := round(
      (_approach_distance_km * LEAST(v_approach_rate, 1::numeric))::numeric,
      2
    );
  END IF;

  FOR v_pricing_result IN
    SELECT * FROM public.get_applicable_pricing(_driver_id, _pickup_address, _destination_address)
  LOOP
    IF v_pricing_result.pricing_type = 'city' AND v_pricing_result.city_pricing_id IS NOT NULL THEN
      FOR v_city_result IN
        SELECT * FROM public.calculate_city_course_price(
          v_pricing_result.city_pricing_id, _distance_km, _duration_minutes, _scheduled_date)
      LOOP
        v_total_with_approach := v_city_result.total_price + v_approach_amount;
        RETURN QUERY SELECT
          v_city_result.base_price, v_city_result.distance_price, v_city_result.time_price,
          v_city_result.subtotal, v_city_result.tva_amount, v_total_with_approach,
          v_city_result.surcharge_evening, v_city_result.surcharge_weekend, 0::NUMERIC,
          v_city_result.peak_adjustment, 'city'::TEXT, v_approach_amount;
        RETURN;
      END LOOP;
    END IF;
  END LOOP;

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
  total_price := v_subtotal + (CASE WHEN v_tva_included THEN 0 ELSE v_tva END) + v_approach_amount;

  RETURN QUERY SELECT base_price, distance_price, time_price, subtotal, tva_amount, total_price,
    v_evening_amount, v_weekend_amount, v_airport_amount, 0::NUMERIC, 'classic'::TEXT, v_approach_amount;
END;
$function$;