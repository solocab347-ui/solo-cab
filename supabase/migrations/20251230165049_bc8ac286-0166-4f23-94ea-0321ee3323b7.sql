-- Ajouter le champ logo_url à la table companies
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Ajouter un commentaire descriptif
COMMENT ON COLUMN public.companies.logo_url IS 'URL du logo de l''entreprise';