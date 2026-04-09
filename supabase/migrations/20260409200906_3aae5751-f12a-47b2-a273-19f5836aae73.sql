
-- Allow guests (anon) and authenticated users without client record to create ride requests
DROP POLICY IF EXISTS "Authenticated users can create ride requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Authenticated can create ride requests" ON public.ride_requests;

-- Allow anyone to insert ride requests (guest bookings have client_id = NULL)
CREATE POLICY "Anyone can create ride requests"
  ON public.ride_requests FOR INSERT TO anon, authenticated
  WITH CHECK (
    client_id IS NULL
    OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
