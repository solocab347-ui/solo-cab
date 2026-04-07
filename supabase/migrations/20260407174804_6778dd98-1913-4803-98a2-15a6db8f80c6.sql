
-- Fix Security Definer View: use security_invoker
DROP VIEW IF EXISTS public.public_fleet_manager_profiles;
CREATE VIEW public.public_fleet_manager_profiles 
WITH (security_invoker = on) AS
SELECT 
  id, company_name, logo_url, description, address,
  visible_to_drivers, status
FROM public.fleet_managers
WHERE status = 'active' AND visible_to_drivers = true;

-- Grant select to anon and authenticated for the view
GRANT SELECT ON public.public_fleet_manager_profiles TO anon, authenticated;

-- Fix ride_requests INSERT: require authenticated user with proper check
DROP POLICY IF EXISTS "Authenticated users can create ride requests" ON public.ride_requests;
CREATE POLICY "Authenticated users can create ride requests"
  ON public.ride_requests FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Fix nfc_plate_orders INSERT: require user_id match
DROP POLICY IF EXISTS "Authenticated users can create plate orders" ON public.nfc_plate_orders;
CREATE POLICY "Authenticated users can create plate orders"
  ON public.nfc_plate_orders FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
