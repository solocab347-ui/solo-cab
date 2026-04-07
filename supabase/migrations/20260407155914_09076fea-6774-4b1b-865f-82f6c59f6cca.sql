
ALTER TABLE public.driver_weekly_balances 
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
  ADD COLUMN IF NOT EXISTS transfer_error text;
