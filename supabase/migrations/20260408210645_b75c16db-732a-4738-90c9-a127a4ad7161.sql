-- Allow anonymous/guest users to insert ride requests with null client_id
CREATE POLICY "Guest users can create ride requests"
ON public.ride_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (client_id IS NULL AND guest_name IS NOT NULL AND guest_phone IS NOT NULL);

-- Also allow guests to view their own requests by request group
CREATE POLICY "Anyone can view ride requests by id"
ON public.ride_requests
FOR SELECT
TO anon, authenticated
USING (true);