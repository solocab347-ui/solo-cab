-- =====================================================
-- STRIPE CONNECT POUR LE PARTAGE DE COURSES
-- =====================================================

-- Ajouter les colonnes Stripe Connect aux chauffeurs
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected',
ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_connect_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_connect_updated_at TIMESTAMPTZ;

-- Table pour suivre les paiements des courses partagées
CREATE TABLE IF NOT EXISTS public.shared_course_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_course_id UUID NOT NULL REFERENCES public.shared_courses(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sender_driver_id UUID NOT NULL REFERENCES public.drivers(id),
  receiver_driver_id UUID NOT NULL REFERENCES public.drivers(id),
  
  -- Montants
  course_amount NUMERIC(10,2) NOT NULL,
  commission_percentage NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) DEFAULT 0,
  
  -- Le client paie au receiver, le receiver verse la commission au sender
  receiver_payout_amount NUMERIC(10,2) NOT NULL, -- Ce que garde le receiver
  sender_commission_amount NUMERIC(10,2) NOT NULL, -- Ce que reçoit le sender
  
  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_transfer_to_sender_id TEXT,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'pending', -- pending, payment_processing, paid, transfer_pending, completed, failed
  payment_captured_at TIMESTAMPTZ,
  transfer_completed_at TIMESTAMPTZ,
  
  -- Métadonnées
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_shared_course_payments_shared_course ON public.shared_course_payments(shared_course_id);
CREATE INDEX IF NOT EXISTS idx_shared_course_payments_sender ON public.shared_course_payments(sender_driver_id);
CREATE INDEX IF NOT EXISTS idx_shared_course_payments_receiver ON public.shared_course_payments(receiver_driver_id);
CREATE INDEX IF NOT EXISTS idx_shared_course_payments_status ON public.shared_course_payments(status);

-- RLS
ALTER TABLE public.shared_course_payments ENABLE ROW LEVEL SECURITY;

-- Les chauffeurs peuvent voir leurs paiements (sender ou receiver)
CREATE POLICY "Drivers can view their shared course payments"
ON public.shared_course_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.user_id = auth.uid()
    AND (d.id = sender_driver_id OR d.id = receiver_driver_id)
  )
);

-- Seul le service role peut insérer/modifier (via edge functions)
CREATE POLICY "Service role can manage shared course payments"
ON public.shared_course_payments
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_shared_course_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_shared_course_payments_updated_at ON public.shared_course_payments;
CREATE TRIGGER trigger_shared_course_payments_updated_at
  BEFORE UPDATE ON public.shared_course_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_course_payments_updated_at();

-- Table pour le solde de compensation (netting) entre partenaires
CREATE TABLE IF NOT EXISTS public.partnership_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.driver_partnerships(id) ON DELETE CASCADE,
  driver_a_id UUID NOT NULL REFERENCES public.drivers(id),
  driver_b_id UUID NOT NULL REFERENCES public.drivers(id),
  
  -- Solde net: positif = A doit à B, négatif = B doit à A
  net_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Totaux cumulés
  total_a_owes_b NUMERIC(10,2) DEFAULT 0,
  total_b_owes_a NUMERIC(10,2) DEFAULT 0,
  
  -- Dernier règlement
  last_settlement_at TIMESTAMPTZ,
  last_settlement_amount NUMERIC(10,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(partnership_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_partnership_balances_drivers ON public.partnership_balances(driver_a_id, driver_b_id);

-- RLS
ALTER TABLE public.partnership_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their partnership balances"
ON public.partnership_balances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.user_id = auth.uid()
    AND (d.id = driver_a_id OR d.id = driver_b_id)
  )
);

CREATE POLICY "Service role can manage partnership balances"
ON public.partnership_balances
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger updated_at
DROP TRIGGER IF EXISTS trigger_partnership_balances_updated_at ON public.partnership_balances;
CREATE TRIGGER trigger_partnership_balances_updated_at
  BEFORE UPDATE ON public.partnership_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_course_payments_updated_at();

-- Historique des règlements
CREATE TABLE IF NOT EXISTS public.partnership_settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.driver_partnerships(id),
  balance_id UUID REFERENCES public.partnership_balances(id),
  
  payer_driver_id UUID NOT NULL REFERENCES public.drivers(id),
  receiver_driver_id UUID NOT NULL REFERENCES public.drivers(id),
  
  amount NUMERIC(10,2) NOT NULL,
  stripe_transfer_id TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.partnership_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their settlements"
ON public.partnership_settlements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.user_id = auth.uid()
    AND (d.id = payer_driver_id OR d.id = receiver_driver_id)
  )
);

CREATE POLICY "Service role can manage settlements"
ON public.partnership_settlements
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Ajouter une colonne pour indiquer si le partage requiert Stripe
ALTER TABLE public.driver_partnerships
ADD COLUMN IF NOT EXISTS stripe_connect_required BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS both_drivers_stripe_ready BOOLEAN DEFAULT FALSE;

-- Mettre à jour shared_courses pour le paiement Stripe
ALTER TABLE public.shared_courses
ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending', -- pending, awaiting_payment, paid, transferred
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.shared_course_payments(id),
ADD COLUMN IF NOT EXISTS client_payment_method TEXT; -- stripe, cash, card_direct

-- Ajouter une contrainte: pour partager, les deux chauffeurs doivent avoir Stripe Connect
COMMENT ON COLUMN public.driver_partnerships.stripe_connect_required IS 'Si true, les deux chauffeurs doivent avoir Stripe Connect pour partager des courses';
COMMENT ON COLUMN public.drivers.stripe_connect_account_id IS 'ID du compte Stripe Connect Express du chauffeur';