
-- Table pour les partenariats entreprise-chauffeur avec accords de paiement
CREATE TABLE public.company_driver_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  
  -- Méthodes de paiement (peut être multiple)
  payment_methods TEXT[] NOT NULL DEFAULT ARRAY['card']::TEXT[], -- card, payment_link, cash, bank_transfer
  
  -- Fréquence de paiement
  payment_frequency TEXT NOT NULL DEFAULT 'per_course', -- per_course, weekly, monthly, mixed
  payment_day INTEGER, -- Jour du mois pour monthly, jour de la semaine pour weekly (1-7)
  
  -- Conditions spéciales
  credit_limit NUMERIC DEFAULT 0, -- Limite de crédit accordée
  discount_percentage NUMERIC DEFAULT 0, -- Remise accordée à l'entreprise
  notes TEXT, -- Notes additionnelles
  
  -- Statut du partenariat
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, suspended, terminated
  proposed_by TEXT NOT NULL DEFAULT 'company', -- company ou driver
  
  -- Signatures
  company_signed BOOLEAN DEFAULT false,
  company_signed_at TIMESTAMPTZ,
  driver_signed BOOLEAN DEFAULT false,
  driver_signed_at TIMESTAMPTZ,
  
  -- Dates importantes
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  
  -- Suivi financier
  total_billed NUMERIC DEFAULT 0,
  total_paid NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  last_payment_date TIMESTAMPTZ,
  next_payment_due TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Un seul accord actif par paire entreprise-chauffeur
  UNIQUE(company_id, driver_id)
);

-- Index pour performance
CREATE INDEX idx_company_driver_agreements_company ON public.company_driver_agreements(company_id);
CREATE INDEX idx_company_driver_agreements_driver ON public.company_driver_agreements(driver_id);
CREATE INDEX idx_company_driver_agreements_status ON public.company_driver_agreements(status);

-- Enable RLS
ALTER TABLE public.company_driver_agreements ENABLE ROW LEVEL SECURITY;

-- Policies pour les entreprises
CREATE POLICY "Companies can view their agreements"
  ON public.company_driver_agreements
  FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Companies can create agreements"
  ON public.company_driver_agreements
  FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()) AND proposed_by = 'company');

CREATE POLICY "Companies can update their agreements"
  ON public.company_driver_agreements
  FOR UPDATE
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Policies pour les chauffeurs
CREATE POLICY "Drivers can view their agreements"
  ON public.company_driver_agreements
  FOR SELECT
  USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Drivers can update their agreements"
  ON public.company_driver_agreements
  FOR UPDATE
  USING (driver_id = get_driver_id(auth.uid()));

-- Policies pour les admins
CREATE POLICY "Admins can manage all agreements"
  ON public.company_driver_agreements
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_company_driver_agreement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_driver_agreements_updated_at
  BEFORE UPDATE ON public.company_driver_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_driver_agreement_timestamp();

-- Table pour l'historique des paiements entreprise
CREATE TABLE public.company_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id UUID NOT NULL REFERENCES public.company_driver_agreements(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL, -- card, payment_link, cash, bank_transfer
  
  -- Période couverte
  period_start DATE,
  period_end DATE,
  
  -- Courses incluses
  course_ids UUID[] DEFAULT ARRAY[]::UUID[],
  courses_count INTEGER DEFAULT 0,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed, cancelled
  paid_at TIMESTAMPTZ,
  
  -- Référence Stripe si applicable
  stripe_payment_id TEXT,
  stripe_invoice_id TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_company_payments_agreement ON public.company_payments(agreement_id);
CREATE INDEX idx_company_payments_status ON public.company_payments(status);

-- Enable RLS
ALTER TABLE public.company_payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Companies can view their payments"
  ON public.company_payments
  FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can view their payments"
  ON public.company_payments
  FOR SELECT
  USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Admins can manage all payments"
  ON public.company_payments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
