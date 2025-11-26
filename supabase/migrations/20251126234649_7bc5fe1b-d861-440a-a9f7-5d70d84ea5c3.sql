-- Mettre à jour la fonction get_platform_stats pour exclure les comptes de démonstration
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stats JSON;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- EXCLUSION: Les comptes de démonstration ne sont pas inclus dans les statistiques
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'total_drivers', (SELECT COUNT(*) FROM public.drivers WHERE is_demo_account = false),
    'validated_drivers', (SELECT COUNT(*) FROM public.drivers WHERE status = 'validated' AND is_demo_account = false),
    'pending_drivers', (SELECT COUNT(*) FROM public.drivers WHERE status = 'pending' AND is_demo_account = false),
    'total_clients', (SELECT COUNT(*) FROM public.clients),
    'exclusive_clients', (SELECT COUNT(*) FROM public.clients WHERE is_exclusive = true),
    'free_clients', (SELECT COUNT(*) FROM public.clients WHERE is_exclusive = false),
    'total_courses', (SELECT COUNT(*) FROM public.courses c INNER JOIN public.drivers d ON (c.driver_id = d.id OR d.id = ANY(c.driver_ids)) WHERE d.is_demo_account = false),
    'completed_courses', (SELECT COUNT(*) FROM public.courses c INNER JOIN public.drivers d ON (c.driver_id = d.id OR d.id = ANY(c.driver_ids)) WHERE c.status = 'completed' AND d.is_demo_account = false),
    'pending_courses', (SELECT COUNT(*) FROM public.courses c INNER JOIN public.drivers d ON (c.driver_id = d.id OR d.id = ANY(c.driver_ids)) WHERE c.status = 'pending' AND d.is_demo_account = false),
    'total_devis', (SELECT COUNT(*) FROM public.devis dv INNER JOIN public.drivers d ON dv.driver_id = d.id WHERE d.is_demo_account = false),
    'accepted_devis', (SELECT COUNT(*) FROM public.devis dv INNER JOIN public.drivers d ON dv.driver_id = d.id WHERE dv.status = 'accepted' AND d.is_demo_account = false),
    'total_revenue', (SELECT COALESCE(SUM(f.amount), 0) FROM public.factures f INNER JOIN public.drivers d ON f.driver_id = d.id WHERE f.payment_status = 'paid' AND d.is_demo_account = false),
    'public_drivers', (SELECT COUNT(*) FROM public.drivers WHERE public_profile_enabled = true AND is_demo_account = false)
  ) INTO stats;

  RETURN stats;
END;
$function$;