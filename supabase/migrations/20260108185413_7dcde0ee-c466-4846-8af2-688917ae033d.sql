-- Ajouter les colonnes d'accès gratuit pour les gestionnaires de flotte
ALTER TABLE public.fleet_managers
ADD COLUMN IF NOT EXISTS free_access_granted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS free_access_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS free_access_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS free_access_type TEXT,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Ajouter un commentaire pour la documentation
COMMENT ON COLUMN public.fleet_managers.free_access_granted IS 'Accès gratuit accordé par admin';
COMMENT ON COLUMN public.fleet_managers.free_access_type IS 'Type d''accès: trial, 1_month, 3_months, 6_months, unlimited';
COMMENT ON COLUMN public.fleet_managers.trial_started_at IS 'Début de la période d''essai gratuit (1 mois)';
COMMENT ON COLUMN public.fleet_managers.trial_ends_at IS 'Fin de la période d''essai gratuit';