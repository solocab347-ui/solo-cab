-- Add column to identify legacy Stripe drivers needing migration
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS is_legacy_stripe boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS legacy_stripe_customer_id text,
ADD COLUMN IF NOT EXISTS legacy_trial_end_date timestamptz,
ADD COLUMN IF NOT EXISTS migration_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS migrated_at timestamptz;

-- Mark all current drivers with Stripe IDs as legacy (without trial_end since it doesn't exist)
UPDATE public.drivers 
SET 
  is_legacy_stripe = true,
  legacy_stripe_customer_id = stripe_customer_id,
  migration_required = true
WHERE stripe_customer_id IS NOT NULL 
   OR subscription_stripe_id IS NOT NULL;

-- Clear old Stripe references (they won't work with new account)
UPDATE public.drivers 
SET 
  stripe_customer_id = NULL,
  subscription_stripe_id = NULL
WHERE is_legacy_stripe = true;

-- Add comment for documentation
COMMENT ON COLUMN public.drivers.is_legacy_stripe IS 'True for drivers registered before Stripe account migration';
COMMENT ON COLUMN public.drivers.legacy_stripe_customer_id IS 'Old Stripe customer ID from previous account (for reference)';
COMMENT ON COLUMN public.drivers.migration_required IS 'True if driver needs to re-subscribe with new Stripe account';
COMMENT ON COLUMN public.drivers.migrated_at IS 'Timestamp when driver completed migration to new Stripe';