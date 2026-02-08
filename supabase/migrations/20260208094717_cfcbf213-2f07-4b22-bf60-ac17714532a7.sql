-- =====================================================
-- MIGRATION: Traçabilité complète des frais Stripe Connect
-- =====================================================

-- 1. Ajouter colonnes pour les frais détaillés sur COURSES
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS stripe_fee_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount_to_driver numeric,
ADD COLUMN IF NOT EXISTS total_fees_amount numeric DEFAULT 0;

COMMENT ON COLUMN public.courses.stripe_fee_amount IS 'Frais Stripe (~1.5% + 0.25€) estimés';
COMMENT ON COLUMN public.courses.net_amount_to_driver IS 'Montant net reçu par le chauffeur après frais';
COMMENT ON COLUMN public.courses.total_fees_amount IS 'Total des frais (SoloCab + Stripe)';

-- 2. Ajouter colonnes sur FACTURES pour breakdown complet
ALTER TABLE public.factures
ADD COLUMN IF NOT EXISTS solocab_fee_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_fee_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_fees_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount_to_driver numeric,
ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_status text,
ADD COLUMN IF NOT EXISTS final_payment_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancellation_fee_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cancellation_fee_charged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_stripe_payment boolean DEFAULT false;

COMMENT ON COLUMN public.factures.solocab_fee_amount IS 'Frais de gestion SoloCab (0.50€)';
COMMENT ON COLUMN public.factures.stripe_fee_amount IS 'Frais Stripe (~1.5% + 0.25€)';
COMMENT ON COLUMN public.factures.net_amount_to_driver IS 'Montant net après tous les frais';
COMMENT ON COLUMN public.factures.deposit_amount IS 'Montant de acompte payé';
COMMENT ON COLUMN public.factures.is_stripe_payment IS 'True si paiement via Stripe Connect';

-- 3. Ajouter colonnes sur DEVIS pour traçabilité
ALTER TABLE public.devis
ADD COLUMN IF NOT EXISTS deposit_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_percentage integer,
ADD COLUMN IF NOT EXISTS deposit_amount numeric,
ADD COLUMN IF NOT EXISTS solocab_fee_amount numeric DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS estimated_stripe_fee numeric,
ADD COLUMN IF NOT EXISTS estimated_net_to_driver numeric,
ADD COLUMN IF NOT EXISTS is_stripe_payment boolean DEFAULT false;

COMMENT ON COLUMN public.devis.solocab_fee_amount IS 'Frais de gestion SoloCab affichés';
COMMENT ON COLUMN public.devis.estimated_stripe_fee IS 'Estimation frais Stripe pour info';

-- 4. Table de suivi des transactions Stripe pour réconciliation
CREATE TABLE IF NOT EXISTS public.stripe_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  facture_id uuid REFERENCES public.factures(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  
  -- Stripe IDs
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_transfer_id text,
  stripe_refund_id text,
  
  -- Transaction type
  transaction_type text NOT NULL CHECK (transaction_type IN (
    'deposit_payment', 
    'final_payment', 
    'full_payment', 
    'cancellation_fee',
    'refund',
    'partner_transfer'
  )),
  
  -- Amounts in EUR
  gross_amount numeric NOT NULL, -- Montant brut
  stripe_fee_amount numeric DEFAULT 0, -- Frais Stripe
  solocab_fee_amount numeric DEFAULT 0, -- Frais SoloCab
  net_amount numeric NOT NULL, -- Montant net au chauffeur
  
  -- Statuts
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  
  -- Metadata
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS pour stripe_transactions
ALTER TABLE public.stripe_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their transactions"
ON public.stripe_transactions
FOR SELECT
USING (driver_id IN (
  SELECT id FROM public.drivers WHERE user_id = auth.uid()
));

CREATE POLICY "Service role can manage transactions"
ON public.stripe_transactions
FOR ALL
USING (true)
WITH CHECK (true);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_course ON public.stripe_transactions(course_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_driver ON public.stripe_transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_facture ON public.stripe_transactions(facture_id);

-- 5. Fonction pour calculer les frais Stripe estimés
CREATE OR REPLACE FUNCTION calculate_stripe_fee(amount_eur numeric)
RETURNS numeric AS $$
BEGIN
  -- Stripe fees: 1.5% + 0.25€ pour l'Europe
  RETURN ROUND((amount_eur * 0.015 + 0.25)::numeric, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Fonction pour calculer le net chauffeur
CREATE OR REPLACE FUNCTION calculate_net_to_driver(
  gross_amount numeric,
  solocab_fee numeric DEFAULT 0.50,
  stripe_fee numeric DEFAULT NULL
)
RETURNS numeric AS $$
DECLARE
  actual_stripe_fee numeric;
BEGIN
  -- Si pas de frais Stripe fourni, calculer
  IF stripe_fee IS NULL THEN
    actual_stripe_fee := calculate_stripe_fee(gross_amount);
  ELSE
    actual_stripe_fee := stripe_fee;
  END IF;
  
  RETURN ROUND((gross_amount - solocab_fee - actual_stripe_fee)::numeric, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;