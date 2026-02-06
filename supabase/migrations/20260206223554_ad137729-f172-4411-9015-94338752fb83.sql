-- Drop the old constraint
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_subscription_status_check;

-- Create a new constraint with all valid values including trialing and expired
ALTER TABLE public.drivers ADD CONSTRAINT drivers_subscription_status_check 
CHECK (subscription_status = ANY (ARRAY['active'::text, 'inactive'::text, 'past_due'::text, 'canceled'::text, 'trialing'::text, 'expired'::text]));