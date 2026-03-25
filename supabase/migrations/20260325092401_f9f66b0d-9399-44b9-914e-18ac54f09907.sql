
-- =============================================
-- 1. Table payments centralisée
-- =============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  devis_id UUID REFERENCES public.devis(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  guest_email TEXT,
  guest_name TEXT,
  guest_phone TEXT,
  
  -- Stripe references
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,
  stripe_refund_id TEXT,
  
  -- Amounts (in euros, 2 decimal)
  amount NUMERIC NOT NULL DEFAULT 0,
  captured_amount NUMERIC DEFAULT 0,
  refunded_amount NUMERIC DEFAULT 0,
  application_fee_amount NUMERIC DEFAULT 0,
  stripe_fee_amount NUMERIC DEFAULT 0,
  net_to_driver NUMERIC DEFAULT 0,
  
  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'pending',
  -- pending, authorized, captured, succeeded, failed, canceled, refunded, partially_refunded
  
  -- Payment type
  payment_type TEXT NOT NULL DEFAULT 'course_payment',
  -- course_payment, card_hold, deposit, cancellation_fee, manual_payment_request
  
  capture_method TEXT DEFAULT 'automatic',
  -- automatic, manual
  
  payment_method TEXT DEFAULT 'card',
  -- card, cash, transfer
  
  currency TEXT DEFAULT 'eur',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Error tracking
  last_error TEXT,
  failure_code TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_payments_course_id ON public.payments(course_id);
CREATE INDEX idx_payments_driver_id ON public.payments(driver_id);
CREATE INDEX idx_payments_client_id ON public.payments(client_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_stripe_pi ON public.payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_type ON public.payments(payment_type);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drivers can view payments for their courses
CREATE POLICY "Drivers can view their payments"
ON public.payments FOR SELECT TO authenticated
USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Clients can view their payments
CREATE POLICY "Clients can view their payments"
ON public.payments FOR SELECT TO authenticated
USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);

-- Service role inserts (from edge functions)
CREATE POLICY "Service can manage payments"
ON public.payments FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- =============================================
-- 2. Ajouter stripe_customer_id aux clients
-- =============================================
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS default_payment_method_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS saved_cards JSONB DEFAULT '[]'::jsonb;

-- =============================================
-- 3. Updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payments_updated_at();
