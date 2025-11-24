-- Ajouter les colonnes pour stocker les augmentations dans les devis
ALTER TABLE public.devis
ADD COLUMN IF NOT EXISTS evening_surcharge_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekend_surcharge_amount numeric DEFAULT 0;

COMMENT ON COLUMN public.devis.evening_surcharge_amount IS 'Montant de l''augmentation soir appliquée au devis';
COMMENT ON COLUMN public.devis.weekend_surcharge_amount IS 'Montant de l''augmentation weekend appliquée au devis';