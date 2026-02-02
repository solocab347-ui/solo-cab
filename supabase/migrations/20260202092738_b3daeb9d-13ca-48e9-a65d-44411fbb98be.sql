-- Add deposit/acompte configuration to drivers
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS deposit_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_percentage integer DEFAULT 20 CHECK (deposit_percentage >= 10 AND deposit_percentage <= 30),
ADD COLUMN IF NOT EXISTS deposit_required_for text DEFAULT 'none' CHECK (deposit_required_for IN ('none', 'new_clients', 'all')),
ADD COLUMN IF NOT EXISTS deposit_refund_policy text DEFAULT 'driver_cancels_only';

-- Add deposit tracking to courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS deposit_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_percentage integer,
ADD COLUMN IF NOT EXISTS deposit_amount numeric,
ADD COLUMN IF NOT EXISTS deposit_paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
ADD COLUMN IF NOT EXISTS deposit_stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS deposit_status text DEFAULT 'not_required' CHECK (deposit_status IN ('not_required', 'pending', 'paid', 'captured', 'refunded', 'forfeited')),
ADD COLUMN IF NOT EXISTS final_payment_amount numeric,
ADD COLUMN IF NOT EXISTS final_payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS final_payment_stripe_id text,
ADD COLUMN IF NOT EXISTS cancellation_by text CHECK (cancellation_by IN ('client', 'driver', 'system'));

-- Create deposit_transactions table for tracking
CREATE TABLE IF NOT EXISTS public.deposit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id),
  client_id uuid REFERENCES public.clients(id),
  amount numeric NOT NULL,
  percentage integer NOT NULL,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'captured', 'refunded', 'forfeited')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  captured_at timestamptz,
  refunded_at timestamptz,
  forfeited_at timestamptz,
  refund_reason text,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit', 'final_payment', 'refund'))
);

-- Enable RLS on deposit_transactions
ALTER TABLE public.deposit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for deposit_transactions
CREATE POLICY "Drivers can view their deposit transactions"
ON public.deposit_transactions FOR SELECT
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Clients can view their deposit transactions"
ON public.deposit_transactions FOR SELECT
USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_course ON public.deposit_transactions(course_id);
CREATE INDEX IF NOT EXISTS idx_deposit_transactions_driver ON public.deposit_transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_courses_deposit_status ON public.courses(deposit_status) WHERE deposit_required = true;

-- Comment the purpose
COMMENT ON COLUMN drivers.deposit_enabled IS 'Whether driver requires deposits for courses';
COMMENT ON COLUMN drivers.deposit_percentage IS 'Percentage of course price required as deposit (10-30%)';
COMMENT ON COLUMN drivers.deposit_required_for IS 'When to require deposit: none, new_clients, all';
COMMENT ON COLUMN courses.deposit_status IS 'Current status of deposit: not_required, pending, paid, captured, refunded, forfeited';