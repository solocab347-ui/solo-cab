-- Ajouter le type de commission (percentage ou fixed) et le montant fixe
ALTER TABLE public.fleet_driver_partnerships
ADD COLUMN IF NOT EXISTS commission_type text NOT NULL DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS commission_fixed_amount numeric DEFAULT NULL;

-- Ajouter les mêmes colonnes pour les modifications en attente
ALTER TABLE public.fleet_driver_partnerships
ADD COLUMN IF NOT EXISTS pending_new_commission_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pending_new_commission_fixed_amount numeric DEFAULT NULL;

-- Ajouter également au table fleet_managers pour la valeur par défaut
ALTER TABLE public.fleet_managers
ADD COLUMN IF NOT EXISTS default_partnership_commission_type text NOT NULL DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS default_partnership_commission_fixed_amount numeric DEFAULT NULL;

-- Contrainte pour s'assurer que les valeurs sont valides
ALTER TABLE public.fleet_driver_partnerships
ADD CONSTRAINT check_commission_type CHECK (commission_type IN ('percentage', 'fixed'));

-- Commentaires
COMMENT ON COLUMN public.fleet_driver_partnerships.commission_type IS 'Type de commission: percentage (%) ou fixed (montant fixe par course)';
COMMENT ON COLUMN public.fleet_driver_partnerships.commission_fixed_amount IS 'Montant fixe de commission par course (utilisé si commission_type = fixed)';