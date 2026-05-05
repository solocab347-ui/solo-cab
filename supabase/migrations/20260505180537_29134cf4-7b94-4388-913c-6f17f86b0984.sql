ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS approach_distance_km numeric(10,2),
  ADD COLUMN IF NOT EXISTS approach_per_km_rate numeric(4,2),
  ADD COLUMN IF NOT EXISTS approach_fee numeric(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS approach_distance_km numeric(10,2),
  ADD COLUMN IF NOT EXISTS approach_per_km_rate numeric(4,2),
  ADD COLUMN IF NOT EXISTS approach_fee numeric(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.ride_requests.approach_fee IS 'Frais d''approche calculés (€) - distance routière chauffeur->client > 2km, courses immédiates uniquement';
COMMENT ON COLUMN public.courses.approach_fee IS 'Frais d''approche persistés (€) - inclus dans le prix total';