-- Ajouter la colonne stripe_customer_id à la table drivers pour le suivi Stripe
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;