-- Ajouter les options de visibilité des contacts dans le profil public du chauffeur
-- Le chauffeur peut choisir d'afficher son téléphone et/ou son email

ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.drivers.show_phone IS 'Si true, le numéro de téléphone est visible sur le profil public';
COMMENT ON COLUMN public.drivers.show_email IS 'Si true, l''email est visible sur le profil public';