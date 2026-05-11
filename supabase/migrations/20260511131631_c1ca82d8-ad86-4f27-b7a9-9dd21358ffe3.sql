
-- 1. Safe contact view (no PII like email/phone/address/push_subscription)
CREATE OR REPLACE VIEW public.profiles_contact_safe
WITH (security_invoker = on) AS
SELECT
  id,
  full_name,
  avatar_url,
  profile_photo_url,
  preferred_language
FROM public.profiles;

GRANT SELECT ON public.profiles_contact_safe TO authenticated;

-- 2. Revoke anon EXECUTE from sensitive admin/role/financial functions.
-- (authenticated keeps access; has_role() checks inside still gate by role.)
DO $$
DECLARE
  fn record;
  sensitive_names text[] := ARRAY[
    'admin_delete_user_cascade',
    'admin_get_all_driver_statistics',
    'add_user_role',
    'assign_user_role',
    'audit_security_posture',
    'auto_fix_all_visibility_issues',
    'calculate_driver_fleet_commissions',
    'calculate_fleet_monthly_billing'
  ];
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(sensitive_names)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, public', fn.proname, fn.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', fn.proname, fn.args);
  END LOOP;
END $$;
