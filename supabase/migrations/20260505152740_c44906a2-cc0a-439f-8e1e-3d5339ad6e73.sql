ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS approach_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approach_per_km_rate numeric(4,2) NOT NULL DEFAULT 0;

ALTER TABLE public.drivers
  DROP CONSTRAINT IF EXISTS drivers_approach_per_km_rate_check;

ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_approach_per_km_rate_check
  CHECK (approach_per_km_rate >= 0 AND approach_per_km_rate <= 1);

COMMENT ON COLUMN public.drivers.approach_enabled IS 'Si true, applique un prix d''approche au-delà de 2 km de distance routière chauffeur->client (courses immédiates uniquement)';
COMMENT ON COLUMN public.drivers.approach_per_km_rate IS 'Tarif par km d''approche en euros (0 à 1 €). Facturé sur tous les km d''approche dès que la distance dépasse 2 km.';