
-- 1. PRIVILEGE ESCALATION FIX
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can insert their own role" ON public.user_roles;

CREATE OR REPLACE FUNCTION public.assign_user_role(
  p_user_id uuid,
  p_role app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_role = 'client' AND p_user_id = auth.uid() THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF public.has_role(auth.uid(), 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, p_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'Unauthorized role assignment';
  END IF;
END;
$$;

CREATE POLICY "Users can only self-assign client role"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'client');

-- 2. DROP DANGEROUS POLICIES
DROP POLICY IF EXISTS "Allow guests to view their booking by token" ON public.courses;
DROP POLICY IF EXISTS "Anyone can view fleet manager basic info" ON public.fleet_managers;
DROP POLICY IF EXISTS "Public can view limited driver profiles" ON public.drivers;
DROP POLICY IF EXISTS "Anyone can view orders by tracking token" ON public.nfc_plate_orders;
DROP POLICY IF EXISTS "Authenticated can view admin ledger" ON public.solo_admin_ledger;
DROP POLICY IF EXISTS "Authenticated users can update their invitation" ON public.congress_invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.company_admin_invitations;
DROP POLICY IF EXISTS "Anyone can validate a token" ON public.guest_registration_tokens;
DROP POLICY IF EXISTS "Public can view valid invitations by token" ON public.company_employee_invitations;
DROP POLICY IF EXISTS "Public can view valid invitations by token" ON public.fleet_client_invitations;
DROP POLICY IF EXISTS "Public can view unused invitations for validation" ON public.fleet_driver_invitations;
DROP POLICY IF EXISTS "Anyone can view unused invitations for validation" ON public.fleet_manager_invitations;
DROP POLICY IF EXISTS "Anyone can view unused tokens for validation" ON public.invitation_tokens;
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON public.company_employee_course_invitations;
DROP POLICY IF EXISTS "Clients can view their own ride requests" ON public.ride_requests;
DROP POLICY IF EXISTS "Lecture publique des paramètres" ON public.system_settings;

-- 3. CREATE REPLACEMENT POLICIES
CREATE POLICY "Only admins and owning drivers can view admin ledger"
  ON public.solo_admin_ledger FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Only admins can update congress invitations"
  ON public.congress_invitations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read system settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Clients can view their own ride requests"
  ON public.ride_requests FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    OR selected_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR accepted_by_driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- 4. PUBLIC FLEET MANAGER VIEW (safe columns only)
CREATE OR REPLACE VIEW public.public_fleet_manager_profiles AS
SELECT 
  id, company_name, logo_url, description, address,
  visible_to_drivers, status
FROM public.fleet_managers
WHERE status = 'active' AND visible_to_drivers = true;
