-- Ajouter la colonne preferred_language à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'fr';

-- Commentaire pour documentation
COMMENT ON COLUMN public.profiles.preferred_language IS 'Langue préférée de l''utilisateur (fr, en, es, it, zh, ar)';