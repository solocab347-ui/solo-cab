
-- 1. Fix SECURITY DEFINER functions missing search_path
ALTER FUNCTION public.accept_ride_request(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.cleanup_geocoding_cache() SET search_path = public;
ALTER FUNCTION public.find_nearby_drivers(numeric, numeric, integer) SET search_path = public;
ALTER FUNCTION public.get_admin_drivers_with_stats() SET search_path = public;
ALTER FUNCTION public.get_daily_stats() SET search_path = public;
ALTER FUNCTION public.learn_from_manual_fix(uuid, text, jsonb, text, boolean, uuid) SET search_path = public;
ALTER FUNCTION public.log_error_with_learning(text, text, text, text, uuid, jsonb, jsonb) SET search_path = public;
ALTER FUNCTION public.log_fix_result(uuid, uuid, boolean, integer) SET search_path = public;
ALTER FUNCTION public.notify_employee_course_accepted() SET search_path = public;
ALTER FUNCTION public.notify_employee_course_assigned() SET search_path = public;
ALTER FUNCTION public.notify_employee_course_cancelled() SET search_path = public;
ALTER FUNCTION public.notify_employee_course_completed() SET search_path = public;
ALTER FUNCTION public.notify_expense_reminder_sent() SET search_path = public;
ALTER FUNCTION public.notify_expense_report_approved() SET search_path = public;
ALTER FUNCTION public.notify_expense_report_reimbursed() SET search_path = public;
ALTER FUNCTION public.notify_expense_report_rejected() SET search_path = public;

-- 2. Fix tables with RLS but no policies
CREATE POLICY "Only admins can view token cache"
ON public.api_token_cache FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage token cache"
ON public.api_token_cache FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can view rate limits"
ON public.rate_limit_state FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Fix dangerous RLS policies
DROP POLICY IF EXISTS "Service role can manage transactions" ON public.stripe_transactions;
CREATE POLICY "Only admins can view stripe transactions"
ON public.stripe_transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role can manage trial_emails" ON public.trial_emails;
CREATE POLICY "Only admins can view trial emails"
ON public.trial_emails FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can manage detected_errors" ON public.detected_errors;
CREATE POLICY "Only admins can view detected errors"
ON public.detected_errors FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can manage error_patterns" ON public.error_patterns;
CREATE POLICY "Only admins can view error patterns"
ON public.error_patterns FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can update invitation usage" ON public.congress_invitations;
CREATE POLICY "Authenticated users can update their invitation"
ON public.congress_invitations FOR UPDATE TO authenticated
USING (true) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow notification creation" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
