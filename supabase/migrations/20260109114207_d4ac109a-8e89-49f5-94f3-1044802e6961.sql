-- Ajouter les colonnes manquantes pour la gestion de pause/reprise Stripe
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS stripe_subscription_paused boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_subscription_paused_at timestamptz;

-- Corriger les chauffeurs avec free_access_granted=true mais subscription_paid=false
UPDATE public.drivers 
SET subscription_paid = true 
WHERE free_access_granted = true AND subscription_paid = false;

-- Ajouter les mêmes colonnes pour fleet_managers
ALTER TABLE public.fleet_managers
ADD COLUMN IF NOT EXISTS stripe_subscription_paused boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_subscription_paused_at timestamptz;