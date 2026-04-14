-- Optimize stripe_transactions for wallet page queries (driver_id + status filter)
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_driver_status 
ON public.stripe_transactions (driver_id, status, created_at DESC);

-- Optimize payments for driver lookup and trigger processing
CREATE INDEX IF NOT EXISTS idx_payments_driver_status 
ON public.payments (driver_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_course_id 
ON public.payments (course_id);

-- Optimize solo_admin_ledger for settlement processing
CREATE INDEX IF NOT EXISTS idx_solo_admin_ledger_driver_status 
ON public.solo_admin_ledger (driver_id, status);

CREATE INDEX IF NOT EXISTS idx_solo_admin_ledger_week_start 
ON public.solo_admin_ledger (week_start, status);

-- Optimize driver_balance_pending for settlement batch processing
CREATE INDEX IF NOT EXISTS idx_driver_balance_pending_settlement 
ON public.driver_balance_pending (status, driver_id) 
WHERE status = 'pending';

-- Optimize stripe_transactions for date-range finance widget queries
CREATE INDEX IF NOT EXISTS idx_stripe_transactions_driver_created 
ON public.stripe_transactions (driver_id, created_at DESC) 
WHERE status IN ('succeeded', 'completed');