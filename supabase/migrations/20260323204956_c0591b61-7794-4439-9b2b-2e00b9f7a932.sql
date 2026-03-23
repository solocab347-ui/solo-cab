ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'card';