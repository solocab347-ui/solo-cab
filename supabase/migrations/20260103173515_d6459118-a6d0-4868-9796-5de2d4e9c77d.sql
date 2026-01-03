-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for payment-proofs bucket
CREATE POLICY "Users can upload their own payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Partners can view shared payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM public.driver_partnerships dp
    JOIN public.drivers d1 ON (dp.driver_a_id = d1.id OR dp.driver_b_id = d1.id)
    JOIN public.drivers d2 ON (dp.driver_a_id = d2.id OR dp.driver_b_id = d2.id)
    WHERE d1.user_id = auth.uid()
    AND d2.user_id::text = (storage.foldername(name))[1]
    AND d1.id != d2.id
    AND dp.status = 'active'
  )
);

-- Create partner_payments table for tracking payments between partners
CREATE TABLE IF NOT EXISTS public.partner_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.driver_partnerships(id) ON DELETE CASCADE,
  payer_driver_id UUID NOT NULL REFERENCES public.drivers(id),
  receiver_driver_id UUID NOT NULL REFERENCES public.drivers(id),
  amount NUMERIC(10,2) NOT NULL,
  payment_reference VARCHAR(100),
  payment_method VARCHAR(50) DEFAULT 'transfer',
  proof_url TEXT,
  notes TEXT,
  period_start DATE,
  period_end DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'confirmed', 'disputed')),
  sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  dispute_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS
ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;

-- Drivers can view payments they're involved in
CREATE POLICY "Drivers can view their payments"
ON public.partner_payments FOR SELECT
USING (
  payer_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  OR receiver_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Drivers can create payments where they are the payer
CREATE POLICY "Drivers can create payments as payer"
ON public.partner_payments FOR INSERT
WITH CHECK (
  payer_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Drivers can update payments they're involved in
CREATE POLICY "Drivers can update their payments"
ON public.partner_payments FOR UPDATE
USING (
  payer_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  OR receiver_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_partner_payments_updated_at
BEFORE UPDATE ON public.partner_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes
CREATE INDEX idx_partner_payments_partnership ON public.partner_payments(partnership_id);
CREATE INDEX idx_partner_payments_payer ON public.partner_payments(payer_driver_id);
CREATE INDEX idx_partner_payments_receiver ON public.partner_payments(receiver_driver_id);
CREATE INDEX idx_partner_payments_status ON public.partner_payments(status);

-- Add payment_due_date column to partner_invoices for alerts
ALTER TABLE public.partner_invoices ADD COLUMN IF NOT EXISTS payment_due_date DATE;
ALTER TABLE public.partner_invoices ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT false;

-- Create function to calculate payment due dates based on partnership schedule
CREATE OR REPLACE FUNCTION public.calculate_payment_due_date(
  created_at TIMESTAMPTZ,
  payment_schedule TEXT
) RETURNS DATE AS $$
BEGIN
  CASE payment_schedule
    WHEN 'per_course' THEN
      -- Due immediately (same day)
      RETURN created_at::DATE;
    WHEN 'weekly' THEN
      -- Due at end of the week (Sunday)
      RETURN (date_trunc('week', created_at) + interval '6 days')::DATE;
    WHEN 'monthly' THEN
      -- Due at end of the month
      RETURN (date_trunc('month', created_at) + interval '1 month' - interval '1 day')::DATE;
    ELSE
      -- Default to 7 days
      RETURN (created_at + interval '7 days')::DATE;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing partner_invoices to set payment_due_date
UPDATE public.partner_invoices pi
SET payment_due_date = public.calculate_payment_due_date(pi.created_at, pi.payment_schedule)
WHERE payment_due_date IS NULL;

-- Create trigger to set payment_due_date on insert
CREATE OR REPLACE FUNCTION public.set_payment_due_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_due_date IS NULL THEN
    NEW.payment_due_date := public.calculate_payment_due_date(NEW.created_at, NEW.payment_schedule);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_payment_due_date
BEFORE INSERT ON public.partner_invoices
FOR EACH ROW
EXECUTE FUNCTION public.set_payment_due_date();

-- Enable realtime for partner_payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_payments;