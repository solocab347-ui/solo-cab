
-- =============================================
-- WEEKLY SETTLEMENT ARCHITECTURE: New tables
-- =============================================

-- 1. Admin fee ledger: tracks every SoloCab fee per course
CREATE TABLE IF NOT EXISTS public.solo_admin_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id),
  driver_id uuid REFERENCES public.drivers(id) NOT NULL,
  fee_amount numeric(10,2) NOT NULL,
  fee_type text NOT NULL DEFAULT 'solo',
  week_start date,
  status text NOT NULL DEFAULT 'pending',
  settlement_id uuid REFERENCES public.weekly_settlements(id),
  created_at timestamptz DEFAULT now(),
  settled_at timestamptz,
  description text
);

-- 2. Driver pending balance: tracks net earnings per course awaiting weekly payout
CREATE TABLE IF NOT EXISTS public.driver_balance_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id) NOT NULL,
  course_id uuid REFERENCES public.courses(id),
  gross_amount numeric(10,2) NOT NULL DEFAULT 0,
  solocab_fee numeric(10,2) NOT NULL DEFAULT 0,
  stripe_fee numeric(10,2) NOT NULL DEFAULT 0,
  net_amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_type text NOT NULL DEFAULT 'course',
  status text NOT NULL DEFAULT 'pending',
  settlement_id uuid REFERENCES public.weekly_settlements(id),
  created_at timestamptz DEFAULT now(),
  settled_at timestamptz
);

-- RLS
ALTER TABLE public.solo_admin_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_balance_pending ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role manages admin ledger" ON public.solo_admin_ledger
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages driver pending" ON public.driver_balance_pending
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Drivers can view their own pending balances
CREATE POLICY "Drivers view own pending balances" ON public.driver_balance_pending
  FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- Admin can view admin ledger
CREATE POLICY "Authenticated can view admin ledger" ON public.solo_admin_ledger
  FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX idx_solo_admin_ledger_status ON public.solo_admin_ledger(status) WHERE status = 'pending';
CREATE INDEX idx_solo_admin_ledger_driver ON public.solo_admin_ledger(driver_id, status);
CREATE INDEX idx_driver_balance_pending_status ON public.driver_balance_pending(status) WHERE status = 'pending';
CREATE INDEX idx_driver_balance_pending_driver ON public.driver_balance_pending(driver_id, status);

-- Add total_admin_fees to weekly_settlements if not exists
ALTER TABLE public.weekly_settlements 
  ADD COLUMN IF NOT EXISTS total_admin_fees_collected numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_transfer_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_stripe_transfer_id text;

-- Validation trigger for fee_type
CREATE OR REPLACE FUNCTION public.validate_admin_ledger_fee_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fee_type NOT IN ('solo', 'shared', 'spontaneous', 'cash_commission') THEN
    RAISE EXCEPTION 'Invalid fee_type: %', NEW.fee_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_admin_ledger_fee_type
  BEFORE INSERT OR UPDATE ON public.solo_admin_ledger
  FOR EACH ROW EXECUTE FUNCTION public.validate_admin_ledger_fee_type();

-- Validation trigger for pending balance status
CREATE OR REPLACE FUNCTION public.validate_pending_balance_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'settled', 'skipped') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_pending_balance_status
  BEFORE INSERT OR UPDATE ON public.driver_balance_pending
  FOR EACH ROW EXECUTE FUNCTION public.validate_pending_balance_status();
