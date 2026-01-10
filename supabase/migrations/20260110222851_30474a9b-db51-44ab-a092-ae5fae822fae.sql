-- Mettre à jour la valeur par défaut de tva_included à TRUE pour les nouveaux chauffeurs
ALTER TABLE public.drivers ALTER COLUMN tva_included SET DEFAULT true;

-- Mettre à jour la valeur par défaut de tva_rate selon le type (10% classique, 20% mise à disposition)
-- Par défaut on garde 10% car la plupart des courses sont classiques
ALTER TABLE public.drivers ALTER COLUMN tva_rate SET DEFAULT 10.00;

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN public.drivers.tva_included IS 'Si TRUE, les prix saisis incluent déjà la TVA (TTC). Si FALSE, les prix sont HT et la TVA sera ajoutée automatiquement.';
COMMENT ON COLUMN public.drivers.tva_rate IS 'Taux de TVA: 10% pour courses classiques, 20% pour mise à disposition. Utilisé uniquement si tva_included = FALSE.';