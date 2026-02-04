-- Ajouter les colonnes de traçabilité aux devis
ALTER TABLE public.devis 
ADD COLUMN IF NOT EXISTS pricing_source TEXT DEFAULT 'classic',
ADD COLUMN IF NOT EXISTS city_pricing_name TEXT,
ADD COLUMN IF NOT EXISTS distance_km NUMERIC;

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN public.devis.pricing_source IS 'Source de tarification: classic ou city';
COMMENT ON COLUMN public.devis.city_pricing_name IS 'Nom de la ville si tarification par ville';
COMMENT ON COLUMN public.devis.distance_km IS 'Distance en km de la course';

-- Ajouter les colonnes de détail à la table factures pour la traçabilité
ALTER TABLE public.factures
ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS distance_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS evening_surcharge_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekend_surcharge_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS peak_hours_surcharge_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pricing_source TEXT DEFAULT 'classic',
ADD COLUMN IF NOT EXISTS city_pricing_name TEXT,
ADD COLUMN IF NOT EXISTS distance_km NUMERIC;

-- Commentaires pour les factures
COMMENT ON COLUMN public.factures.pricing_source IS 'Source de tarification: classic ou city';
COMMENT ON COLUMN public.factures.city_pricing_name IS 'Nom de la ville si tarification par ville';