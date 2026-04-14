
ALTER VIEW IF EXISTS public.driver_data_isolation SET (security_invoker = true);
ALTER VIEW IF EXISTS public.driver_wallets SET (security_invoker = true);
ALTER VIEW IF EXISTS public.driver_partnership_balances SET (security_invoker = true);
ALTER VIEW IF EXISTS public.public_driver_profiles SET (security_invoker = true);
ALTER VIEW IF EXISTS public.public_fleet_manager_profiles SET (security_invoker = true);
ALTER VIEW IF EXISTS public.qr_codes_public SET (security_invoker = true);
ALTER VIEW IF EXISTS public.drivers_visible_to_companies SET (security_invoker = true);
ALTER VIEW IF EXISTS public.drivers_visible_to_fleet_managers SET (security_invoker = true);
ALTER VIEW IF EXISTS public.drivers_available_for_sharing SET (security_invoker = true);
ALTER VIEW IF EXISTS public.fleet_searchable_drivers SET (security_invoker = true);
ALTER VIEW IF EXISTS public.available_partner_courses SET (security_invoker = true);
ALTER VIEW IF EXISTS public.driver_partner_courses_view SET (security_invoker = true);
ALTER VIEW IF EXISTS public.company_fleet_course_requests_view SET (security_invoker = true);
ALTER VIEW IF EXISTS public.fleet_client_dashboard_view SET (security_invoker = true);
ALTER VIEW IF EXISTS public.fleet_company_courses_view SET (security_invoker = true);
ALTER VIEW IF EXISTS public.error_learning_metrics SET (security_invoker = true);
