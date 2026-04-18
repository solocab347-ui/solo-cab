CREATE OR REPLACE FUNCTION public.find_nearby_drivers(
  p_latitude double precision,
  p_longitude double precision,
  p_limit integer DEFAULT 10,
  p_max_radius_km double precision DEFAULT 20,
  p_mode text DEFAULT 'reservation'::text,
  p_favorite_driver_ids uuid[] DEFAULT '{}'::uuid[],
  p_exclusive_driver_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(driver_id uuid, company_name text, display_name text, profile_photo_url text, base_fare numeric, per_km_rate numeric, minimum_price numeric, distance_meters double precision, search_radius_used integer, latitude double precision, longitude double precision, is_live_location boolean, vehicle_brand text, vehicle_model text, vehicle_color text, stripe_connect_charges_enabled boolean, accepted_payment_methods text[])
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
  -- EXCLUSIVE MODE
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
      d.accepted_payment_methods
    FROM public.drivers d
    LEFT JOIN public.profiles p ON p.id = d.user_id
    WHERE d.id = p_exclusive_driver_id
    LIMIT 1;
    RETURN;
  END IF;

  -- STANDARD MODE: relaxed GPS freshness for immediate (30s -> 2 min)
  -- Reason: drivers stationary in their car (waiting at a stand) shouldn't disappear
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
        -- IMMEDIATE: online + GPS < 2 minutes (relaxed from 30s)
        (v_mode = 'immediate'
          AND d.is_available_now = true
          AND d.driver_status IN ('online', 'online_available')
          AND d.last_location_update > now() - interval '2 minutes')
        OR
        -- RESERVATION: online + GPS < 10 minutes (relaxed from 5)
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
    rd.accepted_payment_methods
  FROM ranked_drivers rd
  ORDER BY
    (CASE WHEN rd.is_favorite THEN 0 ELSE 1 END) ASC,
    rd.dist_meters ASC
  LIMIT p_limit;
END;
$function$;