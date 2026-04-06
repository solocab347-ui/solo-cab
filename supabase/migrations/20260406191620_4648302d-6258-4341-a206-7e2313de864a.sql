
-- Table pour suivre les frais SoloCab (espèces, partages, etc.)
CREATE TABLE public.driver_fees_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  fee_type TEXT NOT NULL DEFAULT 'platform_commission',
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  collected_at TIMESTAMPTZ,
  collection_method TEXT,
  stripe_transfer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_driver_fees_ledger_driver_status ON public.driver_fees_ledger(driver_id, status);
CREATE INDEX idx_driver_fees_ledger_course ON public.driver_fees_ledger(course_id);

-- Colonne solde sur drivers pour tracking rapide
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS fees_balance_cents INTEGER NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE public.driver_fees_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own fees"
  ON public.driver_fees_ledger FOR SELECT
  TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages fees"
  ON public.driver_fees_ledger FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
