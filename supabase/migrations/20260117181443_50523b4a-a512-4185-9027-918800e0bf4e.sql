-- Ajouter les colonnes plate_type et amount à la table nfc_plate_orders
ALTER TABLE public.nfc_plate_orders
ADD COLUMN IF NOT EXISTS plate_type TEXT DEFAULT 'large',
ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2) DEFAULT 29.99;

-- Mettre un commentaire pour documenter les types
COMMENT ON COLUMN public.nfc_plate_orders.plate_type IS 'Type de plaque: large (plastique 29.99€) ou small (bois 14.99€)';
COMMENT ON COLUMN public.nfc_plate_orders.amount IS 'Montant de la commande en euros';