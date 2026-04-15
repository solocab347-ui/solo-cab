
-- Table for admin manual financial operations (payouts to drivers, refunds to clients)
CREATE TABLE public.admin_manual_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('driver_payout', 'driver_debit', 'client_refund', 'client_credit', 'regularization')),
  target_type TEXT NOT NULL CHECK (target_type IN ('driver', 'client')),
  target_driver_id UUID REFERENCES public.drivers(id),
  target_client_id UUID REFERENCES public.clients(id),
  amount NUMERIC(10,2) NOT NULL,
  justification TEXT NOT NULL,
  reference_course_id UUID REFERENCES public.courses(id),
  stripe_transfer_id TEXT,
  stripe_refund_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  notes TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_manual_operations ENABLE ROW LEVEL SECURITY;

-- Only admins can access this table
CREATE POLICY "Admins can manage manual operations"
ON public.admin_manual_operations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for quick lookups
CREATE INDEX idx_admin_manual_ops_target_driver ON public.admin_manual_operations(target_driver_id) WHERE target_driver_id IS NOT NULL;
CREATE INDEX idx_admin_manual_ops_target_client ON public.admin_manual_operations(target_client_id) WHERE target_client_id IS NOT NULL;
CREATE INDEX idx_admin_manual_ops_status ON public.admin_manual_operations(status);
CREATE INDEX idx_admin_manual_ops_created ON public.admin_manual_operations(created_at DESC);
