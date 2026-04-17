-- RPC: addresses used 3+ times by current client (for "save as favorite" suggestion banner)
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
  SELECT id INTO _client_id FROM public.clients WHERE user_id = auth.uid() LIMIT 1;
  IF _client_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH all_addr AS (
    SELECT pickup_address AS address,
           pickup_latitude AS latitude,
           pickup_longitude AS longitude,
           created_at
    FROM public.courses
    WHERE client_id = _client_id AND pickup_address IS NOT NULL AND pickup_address <> ''
    UNION ALL
    SELECT destination_address,
           destination_latitude,
           destination_longitude,
           created_at
    FROM public.courses
    WHERE client_id = _client_id AND destination_address IS NOT NULL AND destination_address <> ''
  ),
  agg AS (
    SELECT
      LOWER(address) AS norm_addr,
      (ARRAY_AGG(address ORDER BY created_at DESC))[1] AS address,
      (ARRAY_AGG(latitude ORDER BY created_at DESC))[1] AS latitude,
      (ARRAY_AGG(longitude ORDER BY created_at DESC))[1] AS longitude,
      COUNT(*)::INTEGER AS usage_count,
      MAX(created_at) AS last_used
    FROM all_addr
    GROUP BY LOWER(address)
  )
  SELECT a.address, a.latitude, a.longitude, a.usage_count, a.last_used
  FROM agg a
  WHERE a.usage_count >= GREATEST(_min_count, 1)
    -- exclude addresses already saved as favorites
    AND NOT EXISTS (
      SELECT 1 FROM public.client_saved_addresses csa
      WHERE csa.client_id = _client_id
        AND LOWER(csa.address) = a.norm_addr
    )
  ORDER BY a.usage_count DESC, a.last_used DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_frequent_addresses(INTEGER, INTEGER) TO authenticated;