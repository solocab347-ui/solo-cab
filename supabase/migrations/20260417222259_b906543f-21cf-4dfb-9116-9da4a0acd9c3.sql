
-- 1) Table for saved/favorite client addresses
CREATE TABLE IF NOT EXISTS public.client_saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address_type TEXT NOT NULL DEFAULT 'other' CHECK (address_type IN ('home','work','other')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_saved_addresses_client
  ON public.client_saved_addresses(client_id, position);

ALTER TABLE public.client_saved_addresses ENABLE ROW LEVEL SECURITY;

-- RLS: a client can manage only their own saved addresses
CREATE POLICY "Clients can view their own saved addresses"
  ON public.client_saved_addresses FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can insert their own saved addresses"
  ON public.client_saved_addresses FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update their own saved addresses"
  ON public.client_saved_addresses FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can delete their own saved addresses"
  ON public.client_saved_addresses FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_client_saved_addresses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_saved_addresses_updated_at ON public.client_saved_addresses;
CREATE TRIGGER trg_client_saved_addresses_updated_at
  BEFORE UPDATE ON public.client_saved_addresses
  FOR EACH ROW EXECUTE FUNCTION public.tg_client_saved_addresses_updated_at();

-- 2) RPC: 5 most recent unique addresses (pickup + destination) used by current client
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
  SELECT id INTO _client_id FROM public.clients WHERE user_id = auth.uid() LIMIT 1;
  IF _client_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH all_addr AS (
    SELECT pickup_address AS address,
           pickup_latitude AS latitude,
           pickup_longitude AS longitude,
           created_at AS last_used,
           'pickup'::TEXT AS used_as
    FROM public.courses
    WHERE client_id = _client_id AND pickup_address IS NOT NULL AND pickup_address <> ''
    UNION ALL
    SELECT destination_address,
           destination_latitude,
           destination_longitude,
           created_at,
           'destination'::TEXT
    FROM public.courses
    WHERE client_id = _client_id AND destination_address IS NOT NULL AND destination_address <> ''
  ),
  ranked AS (
    SELECT DISTINCT ON (LOWER(address))
           address, latitude, longitude, last_used, used_as
    FROM all_addr
    ORDER BY LOWER(address), last_used DESC
  )
  SELECT * FROM ranked
  ORDER BY last_used DESC
  LIMIT GREATEST(_limit, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_recent_addresses(INTEGER) TO authenticated;
