-- Ajouter les champs de gestion des accès gratuits dans la table drivers
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS free_access_granted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS free_access_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS free_access_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS free_access_type text;

-- Créer un index pour optimiser les requêtes sur les accès gratuits
CREATE INDEX IF NOT EXISTS idx_drivers_free_access ON public.drivers(free_access_granted, free_access_end_date);

-- Ajouter un commentaire pour documentation
COMMENT ON COLUMN public.drivers.free_access_granted IS 'Indique si le chauffeur bénéficie actuellement d''un accès gratuit';
COMMENT ON COLUMN public.drivers.free_access_start_date IS 'Date de début de l''accès gratuit';
COMMENT ON COLUMN public.drivers.free_access_end_date IS 'Date de fin de l''accès gratuit (NULL pour illimité)';
COMMENT ON COLUMN public.drivers.free_access_type IS 'Type d''accès gratuit: 1_month, 2_months, 3_months, custom, unlimited';