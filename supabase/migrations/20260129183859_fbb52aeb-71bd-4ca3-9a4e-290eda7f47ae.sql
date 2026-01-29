-- Ajouter la colonne trial_cancelled aux tables drivers et fleet_managers
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS trial_cancelled boolean DEFAULT false;

ALTER TABLE public.fleet_managers 
ADD COLUMN IF NOT EXISTS trial_cancelled boolean DEFAULT false;

-- Commenter les colonnes
COMMENT ON COLUMN public.drivers.trial_cancelled IS 'Indique si l''utilisateur a annulé sa période d''essai';
COMMENT ON COLUMN public.fleet_managers.trial_cancelled IS 'Indique si l''utilisateur a annulé sa période d''essai';