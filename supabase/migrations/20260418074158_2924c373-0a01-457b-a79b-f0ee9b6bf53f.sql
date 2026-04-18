-- 1) Fix ambiguous "address" column in get_client_recent_addresses
CREATE OR REPLACE FUNCTION public.get_client_recent_addresses(_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  last_used TIMESTAMPTZ,
  used_as TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client_id UUID;
BEGIN
  SELECT c.id INTO _client_id FROM public.clients c WHERE c.user_id = auth.uid() LIMIT 1;
  IF _client_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH all_addr AS (
    SELECT co.pickup_address AS addr,
           co.pickup_latitude AS lat,
           co.pickup_longitude AS lng,
           co.created_at AS used_at,
           'pickup'::TEXT AS kind
    FROM public.courses co
    WHERE co.client_id = _client_id AND co.pickup_address IS NOT NULL AND co.pickup_address <> ''
    UNION ALL
    SELECT co.destination_address,
           co.destination_latitude,
           co.destination_longitude,
           co.created_at,
           'destination'::TEXT
    FROM public.courses co
    WHERE co.client_id = _client_id AND co.destination_address IS NOT NULL AND co.destination_address <> ''
  ),
  ranked AS (
    SELECT DISTINCT ON (LOWER(a.addr))
           a.addr, a.lat, a.lng, a.used_at, a.kind
    FROM all_addr a
    ORDER BY LOWER(a.addr), a.used_at DESC
  )
  SELECT r.addr, r.lat, r.lng, r.used_at, r.kind FROM ranked r
  ORDER BY r.used_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

-- 2) Fix ambiguous "address" column in get_client_frequent_addresses
CREATE OR REPLACE FUNCTION public.get_client_frequent_addresses(_min_count INTEGER DEFAULT 3, _limit INTEGER DEFAULT 5)
RETURNS TABLE (
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  usage_count INTEGER,
  last_used TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client_id UUID;
BEGIN
  SELECT c.id INTO _client_id FROM public.clients c WHERE c.user_id = auth.uid() LIMIT 1;
  IF _client_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH all_addr AS (
    SELECT co.pickup_address AS addr,
           co.pickup_latitude AS lat,
           co.pickup_longitude AS lng,
           co.created_at AS used_at
    FROM public.courses co
    WHERE co.client_id = _client_id AND co.pickup_address IS NOT NULL AND co.pickup_address <> ''
    UNION ALL
    SELECT co.destination_address,
           co.destination_latitude,
           co.destination_longitude,
           co.created_at
    FROM public.courses co
    WHERE co.client_id = _client_id AND co.destination_address IS NOT NULL AND co.destination_address <> ''
  ),
  agg AS (
    SELECT
      LOWER(a.addr) AS norm_addr,
      (ARRAY_AGG(a.addr ORDER BY a.used_at DESC))[1] AS addr,
      (ARRAY_AGG(a.lat ORDER BY a.used_at DESC))[1] AS lat,
      (ARRAY_AGG(a.lng ORDER BY a.used_at DESC))[1] AS lng,
      COUNT(*)::INTEGER AS cnt,
      MAX(a.used_at) AS last_at
    FROM all_addr a
    GROUP BY LOWER(a.addr)
  )
  SELECT a.addr, a.lat, a.lng, a.cnt, a.last_at
  FROM agg a
  WHERE a.cnt >= GREATEST(_min_count, 1)
    AND NOT EXISTS (
      SELECT 1 FROM public.client_saved_addresses csa
      WHERE csa.client_id = _client_id
        AND LOWER(csa.address) = a.norm_addr
    )
  ORDER BY a.cnt DESC, a.last_at DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

-- 3) Extend find_nearby_drivers with p_exclusive_driver_id
-- When provided, returns ONLY that driver, bypassing all online/GPS/availability filters
-- (used for exclusive clients who must always be able to send reservation requests)
CREATE OR REPLACE FUNCTION public.find_nearby_drivers(
  p_latitude double precision,
  p_longitude double precision,
  p_limit integer DEFAULT 10,
  p_max_radius_km double precision DEFAULT 20,
  p_mode text DEFAULT 'reservation'::text,
  p_favorite_driver_ids uuid[] DEFAULT '{}'::uuid[],
  p_exclusive_driver_id uuid DEFAULT NULL
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
  accepted_payment_methods text[]
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
  -- EXCLUSIVE MODE: return ONLY the assigned driver, no filter at all
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

  -- STANDARD MODE: existing logic with online/GPS filters
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
        (v_mode = 'immediate'
          AND d.is_available_now = true
          AND d.driver_status IN ('online', 'online_available')
          AND d.last_location_update > now() - interval '30 seconds')
        OR
        (v_mode = 'reservation'
          AND d.driver_status IN ('online', 'online_available')
          AND d.last_location_update > now() - interval '5 minutes'
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

-- Drop the old 6-arg version now that the new 7-arg one exists
DROP FUNCTION IF EXISTS public.find_nearby_drivers(double precision, double precision, integer, double precision, text, uuid[]);

GRANT EXECUTE ON FUNCTION public.find_nearby_drivers(double precision, double precision, integer, double precision, text, uuid[], uuid) TO anon, authenticated;