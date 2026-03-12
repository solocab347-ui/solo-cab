
-- Fix remaining functions without search_path (INVOKER functions)
ALTER FUNCTION public.calculate_net_to_driver(numeric, numeric, numeric) SET search_path = public;
ALTER FUNCTION public.calculate_payment_due_date(timestamp with time zone, text) SET search_path = public;
ALTER FUNCTION public.calculate_stripe_fee(numeric) SET search_path = public;
ALTER FUNCTION public.detect_city_from_address(text) SET search_path = public;
ALTER FUNCTION public.detect_paris_address(text) SET search_path = public;
ALTER FUNCTION public.get_applicable_pricing(uuid, text, text) SET search_path = public;
ALTER FUNCTION public.set_default_driver_rating() SET search_path = public;
ALTER FUNCTION public.set_documents_deadline() SET search_path = public;
ALTER FUNCTION public.set_fleet_manager_documents_deadline() SET search_path = public;
ALTER FUNCTION public.set_payment_due_date() SET search_path = public;
ALTER FUNCTION public.sync_sharing_availability() SET search_path = public;
ALTER FUNCTION public.update_shared_course_payments_updated_at() SET search_path = public;
