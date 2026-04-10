ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.ride_requests ADD COLUMN IF NOT EXISTS stripe_payment_method_id text;