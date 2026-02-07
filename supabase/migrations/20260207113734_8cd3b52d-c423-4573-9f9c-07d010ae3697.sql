-- Ajouter la colonne wants_tpe_affiliate à la table drivers
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS wants_tpe_affiliate boolean DEFAULT false;

-- Ajouter aussi tpe_received_at si elle n'existe pas
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS tpe_received_at timestamp with time zone;