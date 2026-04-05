
-- Fix ride_requests: restrict INSERT to authenticated users
DROP POLICY IF EXISTS "Anyone can create ride requests" ON public.ride_requests;
CREATE POLICY "Authenticated users can create ride requests"
ON public.ride_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix nfc_plate_orders: restrict INSERT to authenticated users
DROP POLICY IF EXISTS "Anyone can create plate orders" ON public.nfc_plate_orders;
CREATE POLICY "Authenticated users can create plate orders"
ON public.nfc_plate_orders
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix admin policy to use has_role() instead of profiles.roles
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.nfc_plate_orders;
CREATE POLICY "Admins can manage all orders"
ON public.nfc_plate_orders
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
