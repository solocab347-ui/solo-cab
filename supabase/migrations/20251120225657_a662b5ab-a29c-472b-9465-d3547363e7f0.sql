-- Ajouter les champs pour gérer l'affichage du nom et de l'entreprise dans le profil public
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS display_driver_name BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS display_company_name BOOLEAN DEFAULT false;