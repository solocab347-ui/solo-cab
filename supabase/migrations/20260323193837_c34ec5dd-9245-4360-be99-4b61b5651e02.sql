ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free';
COMMENT ON COLUMN public.drivers.subscription_tier IS 'free or premium - determines feature access level';
UPDATE public.drivers SET subscription_tier = 'free';