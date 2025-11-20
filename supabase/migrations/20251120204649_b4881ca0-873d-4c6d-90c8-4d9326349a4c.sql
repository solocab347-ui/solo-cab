-- Add company_address column to drivers table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drivers' 
    AND column_name = 'company_address'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN company_address TEXT;
  END IF;
END $$;