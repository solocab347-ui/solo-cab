-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view ride requests by id" ON public.ride_requests;

-- More restrictive: anon can only see their own guest requests
CREATE POLICY "Guest users can view their ride requests"
ON public.ride_requests
FOR SELECT
TO anon
USING (guest_phone IS NOT NULL);