-- Add airport_surcharge column to drivers table if it doesn't exist
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS airport_surcharge numeric DEFAULT 0;

-- Add airport_surcharge column to fleet_managers table if it doesn't exist  
ALTER TABLE public.fleet_managers ADD COLUMN IF NOT EXISTS airport_surcharge numeric DEFAULT 0;

-- Add airport_surcharge column to city_pricing table if it doesn't exist
ALTER TABLE public.city_pricing ADD COLUMN IF NOT EXISTS airport_surcharge numeric DEFAULT 0;