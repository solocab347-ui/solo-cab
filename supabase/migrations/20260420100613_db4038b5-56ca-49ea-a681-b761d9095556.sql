-- Index ciblés pour scalabilité du règlement hebdomadaire
-- Permettent le batch lookup des chauffeurs par status pending et la reprise par settlement_id

-- Lookup rapide des chauffeurs actifs avec Stripe Connect
CREATE INDEX IF NOT EXISTS idx_drivers_stripe_active
  ON public.drivers (id)
  WHERE stripe_connect_charges_enabled = true AND stripe_connect_account_id IS NOT NULL;

-- Reprise/idempotence : récupérer ce qui a déjà été traité dans un settlement
CREATE INDEX IF NOT EXISTS idx_driver_weekly_balances_settlement_status
  ON public.driver_weekly_balances (settlement_id, transfer_status);

-- Lookup balances pending par batch (driver_id IN ...)
CREATE INDEX IF NOT EXISTS idx_driver_balance_pending_status_payment
  ON public.driver_balance_pending (status, payment_type, driver_id)
  WHERE status = 'pending';

-- Settlement alerts par settlement (lookup admin dashboard)
CREATE INDEX IF NOT EXISTS idx_settlement_alerts_settlement
  ON public.settlement_alerts (settlement_id, severity, created_at DESC);

-- Heartbeat colonne pour suivre l'avancement (reprise après timeout)
ALTER TABLE public.weekly_settlements
  ADD COLUMN IF NOT EXISTS drivers_processed_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz,
  ADD COLUMN IF NOT EXISTS processed_driver_ids uuid[] DEFAULT ARRAY[]::uuid[];

-- Index pour exclure rapidement les chauffeurs déjà traités lors d'une reprise
CREATE INDEX IF NOT EXISTS idx_weekly_settlements_status_week
  ON public.weekly_settlements (status, week_start DESC);