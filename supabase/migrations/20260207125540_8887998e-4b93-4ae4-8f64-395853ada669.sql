-- Ajouter les colonnes pour tracker la complétion des étapes NFC et Billing
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS onboarding_nfc_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_billing_completed BOOLEAN DEFAULT false;