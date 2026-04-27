ALTER TABLE public.driver_balance_pending
  ADD COLUMN IF NOT EXISTS settled_via_payment_id uuid,
  ADD COLUMN IF NOT EXISTS settled_via_course_id uuid;

CREATE INDEX IF NOT EXISTS idx_dbp_driver_status_type_created
  ON public.driver_balance_pending(driver_id, status, payment_type, created_at);
