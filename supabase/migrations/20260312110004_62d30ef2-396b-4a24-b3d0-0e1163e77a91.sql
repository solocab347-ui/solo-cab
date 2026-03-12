
-- Fix remaining overly permissive INSERT policies

-- auto_fix_logs: restrict to authenticated users
DROP POLICY IF EXISTS "System can insert auto_fix_logs" ON public.auto_fix_logs;
CREATE POLICY "Authenticated can insert auto_fix_logs"
ON public.auto_fix_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- course_queue: restrict to authenticated
DROP POLICY IF EXISTS "System can insert queue items" ON public.course_queue;
CREATE POLICY "Authenticated can insert queue items"
ON public.course_queue FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- error_reports: keep anonymous access (intentional for error reporting)
-- but restrict to anon role explicitly
DROP POLICY IF EXISTS "Anonymous users can create error reports" ON public.error_reports;
DROP POLICY IF EXISTS "Users can create error reports" ON public.error_reports;
CREATE POLICY "Anyone can create error reports"
ON public.error_reports FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- fleet_course_escalations: restrict to authenticated
DROP POLICY IF EXISTS "System can insert escalations" ON public.fleet_course_escalations;
CREATE POLICY "Authenticated can insert escalations"
ON public.fleet_course_escalations FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- nfc_plate_orders: public orders are intentional (anon checkout)
-- keep but restrict to anon+authenticated explicitly (already correct)

-- partner_order_documents: restrict to authenticated
DROP POLICY IF EXISTS "System can create order documents" ON public.partner_order_documents;
CREATE POLICY "Authenticated can create order documents"
ON public.partner_order_documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- ride_requests: restrict to authenticated clients
DROP POLICY IF EXISTS "Clients can create ride requests" ON public.ride_requests;
CREATE POLICY "Authenticated can create ride requests"
ON public.ride_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- security_audit_logs: restrict to admin
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.security_audit_logs;
CREATE POLICY "Admins can insert audit logs"
ON public.security_audit_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- congress_invitations: already fixed with auth check, just narrow USING
DROP POLICY IF EXISTS "Authenticated users can update their invitation" ON public.congress_invitations;
CREATE POLICY "Authenticated users can update their invitation"
ON public.congress_invitations FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
