-- ============================================
-- 1. Table failed_transfers : tracker des virements échoués
-- ============================================
CREATE TABLE IF NOT EXISTS public.failed_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  original_settlement_id uuid REFERENCES public.weekly_settlements(id) ON DELETE SET NULL,
  retry_settlement_id uuid REFERENCES public.weekly_settlements(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  stripe_transfer_id text,
  stripe_payout_id text,
  failure_code text,
  failure_message text,
  status text NOT NULL DEFAULT 'pending_retry' CHECK (status IN (
    'pending_retry',
    'awaiting_rib_update',
    'awaiting_admin_review',
    'retrying',
    'resolved',
    'permanently_failed',
    'cancelled'
  )),
  retry_count integer NOT NULL DEFAULT 0,
  last_retry_at timestamptz,
  resolved_at timestamptz,
  resolution_method text,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_failed_transfers_driver_status
  ON public.failed_transfers (driver_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_failed_transfers_unresolved
  ON public.failed_transfers (status, created_at DESC)
  WHERE status NOT IN ('resolved', 'cancelled', 'permanently_failed');

ALTER TABLE public.failed_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers see their own failed transfers"
  ON public.failed_transfers FOR SELECT
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins see all failed transfers"
  ON public.failed_transfers FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update failed transfers"
  ON public.failed_transfers FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 2. Table rib_change_history : audit log des modifications RIB
-- ============================================
CREATE TABLE IF NOT EXISTS public.rib_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  changed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_method text NOT NULL CHECK (change_method IN ('stripe_elements', 'stripe_account_link', 'admin_manual')),
  old_bank_account_id text,
  old_last4 text,
  old_fingerprint text,
  new_bank_account_id text,
  new_last4 text,
  new_fingerprint text,
  new_bank_name text,
  new_country text,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rib_history_driver_date
  ON public.rib_change_history (driver_id, created_at DESC);

ALTER TABLE public.rib_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers see their own RIB history"
  ON public.rib_change_history FOR SELECT
  USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins see all RIB history"
  ON public.rib_change_history FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. Colonnes drivers : copie locale RIB (sans IBAN)
-- ============================================
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS bank_account_last4 text,
  ADD COLUMN IF NOT EXISTS bank_account_bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_country text,
  ADD COLUMN IF NOT EXISTS bank_account_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS payouts_blocked_until timestamptz,
  ADD COLUMN IF NOT EXISTS payouts_blocked_reason text,
  ADD COLUMN IF NOT EXISTS failed_transfers_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_failed_transfer_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_drivers_payouts_blocked
  ON public.drivers (payouts_blocked_until)
  WHERE payouts_blocked_until IS NOT NULL;

-- ============================================
-- 4. Trigger updated_at sur failed_transfers
-- ============================================
CREATE OR REPLACE FUNCTION public.set_failed_transfers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_failed_transfers_updated_at ON public.failed_transfers;
CREATE TRIGGER trg_failed_transfers_updated_at
  BEFORE UPDATE ON public.failed_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_failed_transfers_updated_at();

-- ============================================
-- 5. Fonction rate-limit : 3 changements RIB / 30 jours
-- ============================================
CREATE OR REPLACE FUNCTION public.check_rib_change_allowed(_driver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_changes integer;
BEGIN
  SELECT COUNT(*) INTO recent_changes
  FROM public.rib_change_history
  WHERE driver_id = _driver_id
    AND success = true
    AND created_at > now() - interval '30 days';

  IF recent_changes >= 3 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'message', 'Maximum 3 changements de RIB sur 30 jours atteint',
      'recent_changes', recent_changes,
      'next_allowed_at', (
        SELECT created_at + interval '30 days'
        FROM public.rib_change_history
        WHERE driver_id = _driver_id AND success = true
        ORDER BY created_at DESC
        OFFSET 2 LIMIT 1
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'recent_changes', recent_changes,
    'remaining', 3 - recent_changes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rib_change_allowed(uuid) TO authenticated;