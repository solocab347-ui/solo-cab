-- Ajouter les colonnes de visibilité manquantes à la table drivers
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS visible_to_companies boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS visible_to_drivers boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_rating_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_rating_partners boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_pricing_partners boolean DEFAULT false;