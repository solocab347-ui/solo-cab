-- Add payment_methods column to driver_partnerships
ALTER TABLE public.driver_partnerships
ADD COLUMN IF NOT EXISTS payment_methods text[] DEFAULT ARRAY['transfer']::text[];