-- Ajouter la photo de profil pour les collaborateurs
ALTER TABLE public.company_employees ADD COLUMN IF NOT EXISTS avatar_url TEXT;