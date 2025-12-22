-- Ajouter les champs pour accord de paiement dans fleet_manager_drivers
ALTER TABLE public.fleet_manager_drivers
ADD COLUMN IF NOT EXISTS payment_schedule TEXT DEFAULT 'per_course',
ADD COLUMN IF NOT EXISTS payment_agreement_signed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_agreement_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_owed NUMERIC DEFAULT 0;

-- Commentaires pour les colonnes
COMMENT ON COLUMN fleet_manager_drivers.payment_schedule IS 'per_course, weekly, monthly';
COMMENT ON COLUMN fleet_manager_drivers.payment_agreement_signed IS 'Si l''accord de commission est signé';
COMMENT ON COLUMN fleet_manager_drivers.total_owed IS 'Total des commissions dues au gestionnaire';