-- Rendre tous les profils chauffeurs automatiquement visibles
-- L'option de visibilité du profil sera supprimée de l'UI

UPDATE public.drivers 
SET public_profile_enabled = true 
WHERE public_profile_enabled IS NULL OR public_profile_enabled = false;

-- Ajouter un commentaire sur la colonne pour documenter le changement
COMMENT ON COLUMN public.drivers.public_profile_enabled IS 'Toujours true - les profils sont automatiquement publics après inscription via le tunnel';