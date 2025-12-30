-- Ajouter la colonne visible_to_companies pour les fleet managers
ALTER TABLE public.fleet_managers
ADD COLUMN IF NOT EXISTS visible_to_companies BOOLEAN DEFAULT false;

-- Mettre à jour les flottes déjà visibles aux chauffeurs pour les rendre aussi visibles aux entreprises
UPDATE public.fleet_managers
SET visible_to_companies = true
WHERE visible_to_drivers = true;