
-- Weekly settlement batches table
CREATE TABLE public.weekly_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  week_end date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_shared_courses integer DEFAULT 0,
  total_commission_volume numeric DEFAULT 0,
  total_platform_fees numeric DEFAULT 0,
  total_solocab_standard_fees numeric DEFAULT 0,
  total_transfers_executed integer DEFAULT 0,
  total_transfer_amount numeric DEFAULT 0,
  stripe_fees_saved_estimate numeric DEFAULT 0,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(week_start, week_end)
);

-- Per-driver weekly balance lines
CREATE TABLE public.driver_weekly_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid REFERENCES public.weekly_settlements(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  -- Amounts the driver should RECEIVE (commissions from courses they shared)
  total_commissions_earned numeric DEFAULT 0,
  -- Amounts the driver should PAY (SoloCab fees: 0.50€ per standard course + 0.10€ per shared course)
  total_solocab_fees numeric DEFAULT 0,
  -- Net amount: positive = driver receives, negative = driver owes SoloCab
  net_amount numeric DEFAULT 0,
  -- Tracking
  shared_courses_as_sender integer DEFAULT 0,
  shared_courses_as_receiver integer DEFAULT 0,
  standard_courses_count integer DEFAULT 0,
  -- Stripe transfer info
  stripe_transfer_id text,
  transfer_status text DEFAULT 'pending',
  transfer_executed_at timestamptz,
  transfer_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(settlement_id, driver_id)
);

-- Track which shared_course_payments were included in which settlement
ALTER TABLE public.shared_course_payments 
  ADD COLUMN IF NOT EXISTS settlement_id uuid REFERENCES public.weekly_settlements(id),
  ADD COLUMN IF NOT EXISTS settled_at timestamptz;

-- Enable RLS
ALTER TABLE public.weekly_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_weekly_balances ENABLE ROW LEVEL SECURITY;

-- Admin-only access for settlements (service role handles processing)
CREATE POLICY "Service role manages settlements" ON public.weekly_settlements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Drivers can view their own balances
CREATE POLICY "Drivers view own weekly balances" ON public.driver_weekly_balances
  FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- Service role manages all balances
CREATE POLICY "Service role manages balances" ON public.driver_weekly_balances
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index for fast settlement queries
CREATE INDEX idx_shared_course_payments_unsettled 
  ON public.shared_course_payments(status, settlement_id) 
  WHERE settlement_id IS NULL AND status = 'completed';

CREATE INDEX idx_driver_weekly_balances_settlement 
  ON public.driver_weekly_balances(settlement_id, driver_id);
