-- Ajout du champ SIREN aux informations d'entreprise des chauffeurs
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS siren TEXT;

-- Ajouter un commentaire pour clarifier l'utilisation
COMMENT ON COLUMN public.drivers.siren IS 'Numéro SIREN de l''entreprise (9 chiffres) - alternatif au SIRET';
COMMENT ON COLUMN public.drivers.siret IS 'Numéro SIRET de l''entreprise (14 chiffres) - au moins l''un des deux (SIRET ou SIREN) doit être rempli';