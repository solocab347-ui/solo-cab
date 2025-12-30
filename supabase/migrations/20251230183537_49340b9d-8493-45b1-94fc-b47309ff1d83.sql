-- Add contact_phone and contact_email columns to drivers table
-- These allow drivers to specify a contact phone/email that can be different from their profile
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.drivers.contact_phone IS 'Contact phone number that can be displayed on public profile';
COMMENT ON COLUMN public.drivers.contact_email IS 'Contact email that can be displayed on public profile';