-- Ajouter le champ card_photo_url pour gérer deux photos distinctes
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS card_photo_url TEXT;

COMMENT ON COLUMN public.drivers.card_photo_url IS 'URL de la photo utilisée pour les cartes (distincte de la photo de profil principale)';
