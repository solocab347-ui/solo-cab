-- Ajouter le champ discount_amount à la table devis
ALTER TABLE public.devis
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS promo_code TEXT;

-- Créer un index sur promo_code pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_devis_promo_code ON public.devis(promo_code);

-- Ajouter le champ discount_amount à la table factures
ALTER TABLE public.factures
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS promo_code TEXT;

-- Créer un index sur promo_code pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_factures_promo_code ON public.factures(promo_code);