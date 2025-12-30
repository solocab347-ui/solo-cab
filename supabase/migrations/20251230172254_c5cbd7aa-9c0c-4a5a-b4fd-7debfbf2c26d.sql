-- Ajouter show_phone pour les entreprises (le contact_phone existe déjà)
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS show_phone boolean DEFAULT false;

-- Ajouter un commentaire pour clarifier
COMMENT ON COLUMN public.companies.show_phone IS 'Indique si le numéro de téléphone est visible par les chauffeurs';