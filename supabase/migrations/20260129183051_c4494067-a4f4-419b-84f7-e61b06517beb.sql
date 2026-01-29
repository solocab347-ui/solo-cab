-- Add columns to track scheduled cancellation
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_cancel_at timestamptz;

-- Add same columns for fleet_managers
ALTER TABLE public.fleet_managers 
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_cancel_at timestamptz;