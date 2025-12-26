-- Ajouter les colonnes pour la gestion de fin de partenariat avec validation des paiements

-- Pour company_driver_agreements
ALTER TABLE public.company_driver_agreements 
ADD COLUMN IF NOT EXISTS termination_requested_by text,
ADD COLUMN IF NOT EXISTS termination_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS termination_pending_payment_validation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS company_confirmed_final_payment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS company_confirmed_final_payment_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS driver_confirmed_final_payment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS driver_confirmed_final_payment_at timestamp with time zone;

-- Pour fleet_driver_partnerships
ALTER TABLE public.fleet_driver_partnerships
ADD COLUMN IF NOT EXISTS termination_requested_by text,
ADD COLUMN IF NOT EXISTS termination_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS termination_pending_payment_validation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fleet_manager_confirmed_final_payment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fleet_manager_confirmed_final_payment_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS driver_confirmed_final_payment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS driver_confirmed_final_payment_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS termination_reason text;

-- Ajouter un index pour les statuts de paiement
CREATE INDEX IF NOT EXISTS idx_company_payments_status ON public.company_payments(status);
CREATE INDEX IF NOT EXISTS idx_company_payments_agreement ON public.company_payments(agreement_id);

-- Créer une table pour les paiements des partenariats fleet-driver si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.fleet_partnership_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id uuid NOT NULL REFERENCES public.fleet_driver_partnerships(id) ON DELETE CASCADE,
  fleet_manager_id uuid NOT NULL REFERENCES public.fleet_managers(id),
  driver_id uuid NOT NULL REFERENCES public.drivers(id),
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  period_start date,
  period_end date,
  courses_count integer,
  status text DEFAULT 'pending',
  sent_at timestamp with time zone,
  sent_by_user_id uuid,
  received_at timestamp with time zone,
  received_confirmed_by_user_id uuid,
  payment_reference text,
  notes text,
  dispute_reason text,
  dispute_status text,
  dispute_created_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fleet_partnership_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fleet_partnership_payments
CREATE POLICY "Fleet managers can manage their payments"
ON public.fleet_partnership_payments
FOR ALL
USING (
  fleet_manager_id IN (
    SELECT id FROM fleet_managers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can view and confirm their payments"
ON public.fleet_partnership_payments
FOR ALL
USING (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_fleet_partnership_payments_status ON public.fleet_partnership_payments(status);
CREATE INDEX IF NOT EXISTS idx_fleet_partnership_payments_partnership ON public.fleet_partnership_payments(partnership_id);