-- Ajouter les colonnes d'abonnement à la table drivers
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled')),
ADD COLUMN IF NOT EXISTS subscription_stripe_id text,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone;

-- Commentaire sur les champs
COMMENT ON COLUMN public.drivers.subscription_status IS 'Statut de l''abonnement Stripe: active, inactive, past_due, canceled';
COMMENT ON COLUMN public.drivers.subscription_stripe_id IS 'ID de l''abonnement Stripe';
COMMENT ON COLUMN public.drivers.subscription_end_date IS 'Date de fin de l''abonnement';
