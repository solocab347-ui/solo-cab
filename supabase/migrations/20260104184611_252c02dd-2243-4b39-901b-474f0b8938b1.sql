-- Allow devis without registered client (for guest bookings)
ALTER TABLE public.devis ALTER COLUMN client_id DROP NOT NULL;

-- Update RLS policy to allow drivers to create devis with null client_id
DROP POLICY IF EXISTS "Drivers can create devis for their courses" ON public.devis;

CREATE POLICY "Drivers can create devis for their courses"
ON public.devis
FOR INSERT
WITH CHECK (
  driver_id = get_driver_id(auth.uid())
  AND (
    client_id IS NULL  -- Allow guest bookings
    OR client_id IN (
      SELECT id FROM public.clients 
      WHERE driver_id = get_driver_id(auth.uid()) 
         OR get_driver_id(auth.uid()) = ANY(driver_ids)
    )
  )
);