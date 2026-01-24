
-- Add payment configuration columns to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS accepted_payment_methods text[] DEFAULT ARRAY['cash', 'card', 'transfer']::text[],
ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'own_equipment' CHECK (billing_type IN ('own_equipment', 'solocab_stripe')),
ADD COLUMN IF NOT EXISTS show_payment_methods_publicly boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS default_payment_method text DEFAULT 'not_specified',
ADD COLUMN IF NOT EXISTS payment_config_updated_at timestamptz DEFAULT now();

-- Create index for billing type queries
CREATE INDEX IF NOT EXISTS idx_drivers_billing_type ON public.drivers(billing_type);

-- Add comment for documentation
COMMENT ON COLUMN public.drivers.billing_type IS 'own_equipment = driver has TPE/own payment tools, solocab_stripe = uses SoloCab Stripe Connect for online payments';
COMMENT ON COLUMN public.drivers.accepted_payment_methods IS 'Array of accepted payment methods: cash, card, transfer, check, other';
