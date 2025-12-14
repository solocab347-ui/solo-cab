-- Allow guest bookings without client_id
ALTER TABLE public.courses ALTER COLUMN client_id DROP NOT NULL;

-- Update RLS policy to properly allow guest bookings without authentication
DROP POLICY IF EXISTS "Allow guest bookings creation" ON public.courses;
CREATE POLICY "Allow guest bookings creation" 
ON public.courses 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  is_guest_booking = true 
  AND guest_email IS NOT NULL 
  AND guest_phone IS NOT NULL
  AND driver_id IS NOT NULL
);