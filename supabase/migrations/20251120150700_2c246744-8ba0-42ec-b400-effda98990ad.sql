-- Add driver_ids array to clients table for dual association compatibility
-- This maintains backward compatibility while supporting new multi-driver model

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS driver_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Create index for driver_ids array queries
CREATE INDEX IF NOT EXISTS idx_clients_driver_ids ON public.clients USING GIN(driver_ids);

-- Add qr_code_image column to qr_codes table for base64 storage
ALTER TABLE public.qr_codes
ADD COLUMN IF NOT EXISTS qr_code_image TEXT;

-- Update RLS policies for clients to support dual association
DROP POLICY IF EXISTS "Drivers can view their exclusive clients" ON public.clients;

CREATE POLICY "Drivers can view their exclusive clients (dual association)"
ON public.clients
FOR SELECT
TO authenticated
USING (
  (driver_id = get_driver_id(auth.uid()) AND is_exclusive = true)
  OR 
  (get_driver_id(auth.uid()) = ANY(driver_ids) AND is_exclusive = true)
);

-- Allow public access to QR codes for registration
DROP POLICY IF EXISTS "Anyone can view active QR codes" ON public.qr_codes;

CREATE POLICY "Public can view active QR codes"
ON public.qr_codes
FOR SELECT
TO anon, authenticated
USING (is_active = true);

COMMENT ON COLUMN public.clients.driver_ids IS 'Array of driver IDs for multi-driver support (dual association with driver_id)';
COMMENT ON COLUMN public.qr_codes.qr_code_image IS 'Base64 encoded QR code image for client registration';