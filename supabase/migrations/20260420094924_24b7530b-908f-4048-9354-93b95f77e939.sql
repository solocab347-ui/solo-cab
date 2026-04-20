-- 1. Ajouter dette cash cumulée sur le chauffeur
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS cash_debt_pending numeric(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.drivers.cash_debt_pending IS
  'Commissions SoloCab dues sur courses cash. Compensées sur futurs virements card positifs.';

-- 2. Table d'alertes de règlement
CREATE TABLE IF NOT EXISTS public.settlement_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid REFERENCES public.weekly_settlements(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  message text NOT NULL,
  details jsonb,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlement_alerts_unresolved
  ON public.settlement_alerts (created_at DESC) WHERE is_resolved = false;

ALTER TABLE public.settlement_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin views settlement alerts" ON public.settlement_alerts;
CREATE POLICY "Admin views settlement alerts" ON public.settlement_alerts
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages settlement alerts" ON public.settlement_alerts;
CREATE POLICY "Service role manages settlement alerts" ON public.settlement_alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin updates settlement alerts" ON public.settlement_alerts;
CREATE POLICY "Admin updates settlement alerts" ON public.settlement_alerts
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 3. Vue prévisionnelle du prochain règlement par chauffeur
CREATE OR REPLACE VIEW public.driver_settlement_preview
WITH (security_invoker = true) AS
SELECT
  d.id AS driver_id,
  d.company_name,
  d.cash_debt_pending,
  COALESCE(SUM(CASE WHEN dbp.payment_type = 'card' THEN dbp.net_amount ELSE 0 END), 0)::numeric(10,2) AS card_to_transfer,
  COALESCE(SUM(CASE WHEN dbp.payment_type = 'cash' THEN dbp.solocab_fee ELSE 0 END), 0)::numeric(10,2) AS cash_fees_owed_this_week,
  COALESCE(SUM(CASE WHEN dbp.payment_type = 'cash' THEN dbp.gross_amount ELSE 0 END), 0)::numeric(10,2) AS cash_collected_this_week,
  COUNT(*) FILTER (WHERE dbp.payment_type = 'card') AS card_courses,
  COUNT(*) FILTER (WHERE dbp.payment_type = 'cash') AS cash_courses,
  GREATEST(
    COALESCE(SUM(CASE WHEN dbp.payment_type = 'card' THEN dbp.net_amount ELSE 0 END), 0)
    - d.cash_debt_pending
    - COALESCE(SUM(CASE WHEN dbp.payment_type = 'cash' THEN dbp.solocab_fee ELSE 0 END), 0),
    0
  )::numeric(10,2) AS net_to_transfer_estimate,
  d.stripe_connect_account_id,
  d.stripe_connect_charges_enabled
FROM public.drivers d
LEFT JOIN public.driver_balance_pending dbp
  ON dbp.driver_id = d.id AND dbp.status = 'pending'
GROUP BY d.id, d.company_name, d.cash_debt_pending,
         d.stripe_connect_account_id, d.stripe_connect_charges_enabled;

GRANT SELECT ON public.driver_settlement_preview TO authenticated, service_role;