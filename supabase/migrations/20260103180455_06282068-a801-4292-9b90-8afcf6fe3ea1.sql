-- Add columns for payment reminder tracking
ALTER TABLE public.partner_invoices 
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS received_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS received_confirmed_by UUID REFERENCES auth.users(id);

-- Add sent_at tracking for outgoing payments on invoices
ALTER TABLE public.partner_invoices
ADD COLUMN IF NOT EXISTS payment_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_sent_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Create function to check if payment can be confirmed based on schedule
CREATE OR REPLACE FUNCTION public.can_confirm_payment_by_schedule(
  p_payment_schedule TEXT,
  p_billing_period_end DATE
) RETURNS BOOLEAN AS $$
DECLARE
  current_date_val DATE := CURRENT_DATE;
BEGIN
  CASE p_payment_schedule
    WHEN 'per_course' THEN
      -- Per course: can confirm immediately
      RETURN TRUE;
    WHEN 'weekly' THEN
      -- Weekly: can confirm only after billing period end (end of week)
      RETURN current_date_val >= p_billing_period_end;
    WHEN 'monthly' THEN
      -- Monthly: can confirm only after billing period end (end of month)
      RETURN current_date_val >= p_billing_period_end;
    ELSE
      -- Default: allow confirmation
      RETURN TRUE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;