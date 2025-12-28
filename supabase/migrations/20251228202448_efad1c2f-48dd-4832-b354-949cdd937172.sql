-- Ajouter le numéro de TVA intracommunautaire pour les chauffeurs
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS tva_number text;

-- Ajouter le numéro de TVA intracommunautaire pour les gestionnaires de flotte
ALTER TABLE public.fleet_managers ADD COLUMN IF NOT EXISTS tva_number text;

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN public.drivers.tva_number IS 'Numéro de TVA intracommunautaire du chauffeur (ex: FR12345678901)';
COMMENT ON COLUMN public.fleet_managers.tva_number IS 'Numéro de TVA intracommunautaire du gestionnaire de flotte';