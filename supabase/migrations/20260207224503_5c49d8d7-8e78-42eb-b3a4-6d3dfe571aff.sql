-- Ajouter les colonnes pour le système d'empreinte bancaire

ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS stripe_setup_intent_id TEXT,
ADD COLUMN IF NOT EXISTS card_hold_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS card_hold_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;

-- Commentaires pour documentation
COMMENT ON COLUMN public.courses.stripe_setup_intent_id IS 'ID du SetupIntent Stripe pour l''empreinte bancaire';
COMMENT ON COLUMN public.courses.card_hold_status IS 'Statut de l''empreinte: pending, confirmed, failed';
COMMENT ON COLUMN public.courses.card_hold_confirmed_at IS 'Date de confirmation de l''empreinte';
COMMENT ON COLUMN public.courses.stripe_payment_method_id IS 'ID de la méthode de paiement Stripe enregistrée';

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_courses_card_hold_status ON public.courses(card_hold_status) WHERE card_hold_status IS NOT NULL;