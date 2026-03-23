DROP POLICY IF EXISTS "Authenticated can create ride requests" ON public.ride_requests;

CREATE POLICY "Anyone can create ride requests"
ON public.ride_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Clients can view their own ride requests" ON public.ride_requests;
CREATE POLICY "Clients can view their own ride requests"
ON public.ride_requests
FOR SELECT
TO anon, authenticated
USING (
  (client_id IN (SELECT clients.id FROM clients WHERE clients.user_id = auth.uid()))
  OR (guest_phone IS NOT NULL)
);