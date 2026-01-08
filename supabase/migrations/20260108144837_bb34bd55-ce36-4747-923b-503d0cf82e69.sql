
-- Mise à jour de get_platform_stats pour:
-- 1. Exclure les clients liés aux chauffeurs démo (Alexandre)
-- 2. Ajouter les statistiques des pionniers (ils sont déjà comptés comme chauffeurs avec is_demo_account=false)
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

  -- EXCLUSION: Les comptes de démonstration (is_demo_account=true) ne sont pas inclus
  -- Les pionniers (is_pioneer=true) SONT inclus car ce sont des vrais chauffeurs
  SELECT json_build_object(
    -- Utilisateurs totaux (excluant les utilisateurs créés pour les comptes démo)
    'total_users', (SELECT COUNT(*) FROM auth.users),
    
    -- Chauffeurs (incluant pionniers, excluant démo)
    'total_drivers', (SELECT COUNT(*) FROM public.drivers WHERE is_demo_account = false),
    'validated_drivers', (SELECT COUNT(*) FROM public.drivers WHERE status = 'validated' AND is_demo_account = false),
    'pending_drivers', (SELECT COUNT(*) FROM public.drivers WHERE status = 'pending' AND is_demo_account = false),
    
    -- Stats pionniers spécifiques
    'total_pioneers', (SELECT COUNT(*) FROM public.drivers WHERE is_pioneer = true AND is_demo_account = false),
    'validated_pioneers', (SELECT COUNT(*) FROM public.drivers WHERE is_pioneer = true AND status = 'validated' AND is_demo_account = false),
    'pending_pioneers', (SELECT COUNT(*) FROM public.drivers WHERE is_pioneer = true AND status = 'pending' AND is_demo_account = false),
    'pioneers_with_subscription', (SELECT COUNT(*) FROM public.drivers WHERE is_pioneer = true AND subscription_paid = true AND is_demo_account = false),
    'pioneers_in_trial', (SELECT COUNT(*) FROM public.drivers WHERE is_pioneer = true AND free_access_type = 'trial' AND is_demo_account = false),
    
    -- Clients (EXCLUANT ceux liés à des chauffeurs démo)
    'total_clients', (
      SELECT COUNT(*) FROM public.clients c
      WHERE NOT EXISTS (
        SELECT 1 FROM public.drivers d 
        WHERE d.id = c.driver_id AND d.is_demo_account = true
      )
    ),
    'exclusive_clients', (
      SELECT COUNT(*) FROM public.clients c
      WHERE c.is_exclusive = true
      AND NOT EXISTS (
        SELECT 1 FROM public.drivers d 
        WHERE d.id = c.driver_id AND d.is_demo_account = true
      )
    ),
    'free_clients', (
      SELECT COUNT(*) FROM public.clients c
      WHERE c.is_exclusive = false
      AND NOT EXISTS (
        SELECT 1 FROM public.drivers d 
        WHERE d.id = c.driver_id AND d.is_demo_account = true
      )
    ),
    
    -- Courses (excluant démo)
    'total_courses', (
      SELECT COUNT(*) FROM public.courses c 
      INNER JOIN public.drivers d ON (c.driver_id = d.id OR d.id = ANY(c.driver_ids)) 
      WHERE d.is_demo_account = false
    ),
    'completed_courses', (
      SELECT COUNT(*) FROM public.courses c 
      INNER JOIN public.drivers d ON (c.driver_id = d.id OR d.id = ANY(c.driver_ids)) 
      WHERE c.status = 'completed' AND d.is_demo_account = false
    ),
    'pending_courses', (
      SELECT COUNT(*) FROM public.courses c 
      INNER JOIN public.drivers d ON (c.driver_id = d.id OR d.id = ANY(c.driver_ids)) 
      WHERE c.status = 'pending' AND d.is_demo_account = false
    ),
    
    -- Devis (excluant démo)
    'total_devis', (
      SELECT COUNT(*) FROM public.devis dv 
      INNER JOIN public.drivers d ON dv.driver_id = d.id 
      WHERE d.is_demo_account = false
    ),
    'accepted_devis', (
      SELECT COUNT(*) FROM public.devis dv 
      INNER JOIN public.drivers d ON dv.driver_id = d.id 
      WHERE dv.status = 'accepted' AND d.is_demo_account = false
    ),
    
    -- Revenus (excluant démo)
    'total_revenue', (
      SELECT COALESCE(SUM(f.amount), 0) FROM public.factures f 
      INNER JOIN public.drivers d ON f.driver_id = d.id 
      WHERE f.payment_status = 'paid' AND d.is_demo_account = false
    ),
    
    -- Profils publics (excluant démo)
    'public_drivers', (
      SELECT COUNT(*) FROM public.drivers 
      WHERE public_profile_enabled = true AND is_demo_account = false
    )
  ) INTO stats;

  RETURN stats;
END;
$function$;
