-- Table pour les partenariats entre entreprises et gestionnaires de flotte
CREATE TABLE public.company_fleet_agreements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
    proposed_by VARCHAR(20) NOT NULL DEFAULT 'company' CHECK (proposed_by IN ('company', 'fleet_manager')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'terminated')),
    
    -- Signatures
    company_signed BOOLEAN DEFAULT FALSE,
    company_signed_at TIMESTAMPTZ,
    fleet_manager_signed BOOLEAN DEFAULT FALSE,
    fleet_manager_signed_at TIMESTAMPTZ,
    
    -- Conditions de paiement
    payment_methods TEXT[] DEFAULT ARRAY['card'],
    payment_frequency VARCHAR(20) DEFAULT 'monthly',
    payment_day INTEGER,
    
    -- Notes et messages
    notes TEXT,
    proposal_message TEXT,
    rejection_reason TEXT,
    
    -- Terminaison du partenariat
    termination_requested_by VARCHAR(20),
    termination_requested_at TIMESTAMPTZ,
    termination_reason TEXT,
    terminated_at TIMESTAMPTZ,
    termination_pending_payment_validation BOOLEAN DEFAULT FALSE,
    company_confirmed_final_payment BOOLEAN DEFAULT FALSE,
    company_confirmed_final_payment_at TIMESTAMPTZ,
    fleet_confirmed_final_payment BOOLEAN DEFAULT FALSE,
    fleet_confirmed_final_payment_at TIMESTAMPTZ,
    
    -- Statistiques
    total_courses INTEGER DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Timestamps
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    UNIQUE(company_id, fleet_manager_id)
);

-- Enable RLS
ALTER TABLE public.company_fleet_agreements ENABLE ROW LEVEL SECURITY;

-- Policies pour company_fleet_agreements
CREATE POLICY "Companies can view their own fleet agreements"
ON public.company_fleet_agreements
FOR SELECT
USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Fleet managers can view their own company agreements"
ON public.company_fleet_agreements
FOR SELECT
USING (
    fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
);

CREATE POLICY "Companies can create fleet agreements"
ON public.company_fleet_agreements
FOR INSERT
WITH CHECK (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Fleet managers can create company agreements"
ON public.company_fleet_agreements
FOR INSERT
WITH CHECK (
    fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
);

CREATE POLICY "Parties can update their agreements"
ON public.company_fleet_agreements
FOR UPDATE
USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    OR fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
);

-- Index pour performances
CREATE INDEX idx_company_fleet_agreements_company ON public.company_fleet_agreements(company_id);
CREATE INDEX idx_company_fleet_agreements_fleet ON public.company_fleet_agreements(fleet_manager_id);
CREATE INDEX idx_company_fleet_agreements_status ON public.company_fleet_agreements(status);

-- Trigger pour mise à jour automatique de updated_at
CREATE TRIGGER update_company_fleet_agreements_updated_at
BEFORE UPDATE ON public.company_fleet_agreements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table pour les paiements liés aux partenariats entreprise-flotte
CREATE TABLE public.company_fleet_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    agreement_id UUID NOT NULL REFERENCES public.company_fleet_agreements(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id),
    fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'received', 'disputed')),
    
    -- Suivi des envois et confirmations
    sent_at TIMESTAMPTZ,
    sent_by_user_id UUID,
    received_at TIMESTAMPTZ,
    received_confirmed_by_user_id UUID,
    
    -- Période couverte
    period_start DATE,
    period_end DATE,
    courses_count INTEGER DEFAULT 0,
    course_ids UUID[],
    
    -- Notes et litiges
    payment_reference VARCHAR(100),
    notes TEXT,
    dispute_reason TEXT,
    dispute_status VARCHAR(20),
    dispute_created_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_fleet_payments ENABLE ROW LEVEL SECURITY;

-- Policies pour company_fleet_payments
CREATE POLICY "Companies can view their fleet payments"
ON public.company_fleet_payments
FOR SELECT
USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Fleet managers can view their company payments"
ON public.company_fleet_payments
FOR SELECT
USING (
    fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
);

CREATE POLICY "Companies can create fleet payments"
ON public.company_fleet_payments
FOR INSERT
WITH CHECK (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
);

CREATE POLICY "Parties can update their payments"
ON public.company_fleet_payments
FOR UPDATE
USING (
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    OR fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
);

-- Index
CREATE INDEX idx_company_fleet_payments_agreement ON public.company_fleet_payments(agreement_id);
CREATE INDEX idx_company_fleet_payments_company ON public.company_fleet_payments(company_id);
CREATE INDEX idx_company_fleet_payments_fleet ON public.company_fleet_payments(fleet_manager_id);