-- Migration: Supprimer la colonne payment_method_preference obsolète de la table courses
-- Cette colonne n'est plus utilisée suite aux changements de workflow

ALTER TABLE public.courses 
DROP COLUMN IF EXISTS payment_method_preference;

-- Ajouter un commentaire sur la table pour expliquer le workflow actuel
COMMENT ON TABLE public.courses IS 'Table des courses SoloCab. Le paiement est géré après la course terminée, pas au moment de la création.';
