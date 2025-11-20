-- Enable realtime for courses and devis tables
ALTER TABLE public.courses REPLICA IDENTITY FULL;
ALTER TABLE public.devis REPLICA IDENTITY FULL;

-- Add RLS policy for clients to insert courses
CREATE POLICY "Clients can create their own courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (client_id = get_client_id(auth.uid()));

-- Add RLS policy for drivers to insert devis
CREATE POLICY "Drivers can create devis for their courses"
ON public.devis
FOR INSERT
TO authenticated
WITH CHECK (driver_id = get_driver_id(auth.uid()));

-- Update devis policies for client acceptance
DROP POLICY IF EXISTS "Clients can update their devis status" ON public.devis;

CREATE POLICY "Clients can accept/reject their devis"
ON public.devis
FOR UPDATE
TO authenticated
USING (client_id = get_client_id(auth.uid()))
WITH CHECK (client_id = get_client_id(auth.uid()));

COMMENT ON POLICY "Clients can accept/reject their devis" ON public.devis IS 'Fixes the bug preventing clients from accepting quotes';