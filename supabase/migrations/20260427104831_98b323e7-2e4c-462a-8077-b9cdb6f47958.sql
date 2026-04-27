CREATE TABLE IF NOT EXISTS public.arrears_recovery_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  recovery_payment_id UUID,
  recovery_course_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pending_row', 'consolidated_debt')),
  source_pending_id UUID,
  source_origin_course_id UUID,
  amount_recovered_cents INTEGER NOT NULL CHECK (amount_recovered_cents >= 0),
  consolidated_debt_before_cents INTEGER,
  consolidated_debt_after_cents INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arrears_log_driver ON public.arrears_recovery_log(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arrears_log_payment ON public.arrears_recovery_log(recovery_payment_id);
CREATE INDEX IF NOT EXISTS idx_arrears_log_course ON public.arrears_recovery_log(recovery_course_id);

ALTER TABLE public.arrears_recovery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all arrears recovery logs"
ON public.arrears_recovery_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers can view their own arrears recovery logs"
ON public.arrears_recovery_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = arrears_recovery_log.driver_id
      AND d.user_id = auth.uid()
  )
);

-- Index pour la détection des incohérences (settled sans transfer)
CREATE INDEX IF NOT EXISTS idx_dbp_settled_no_transfer
  ON public.driver_balance_pending(driver_id, settlement_id)
  WHERE status = 'settled' AND settled_via_payment_id IS NULL;