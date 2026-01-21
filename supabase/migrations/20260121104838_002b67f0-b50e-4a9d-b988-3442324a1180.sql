-- Mise à jour de get_platform_stats pour inclure les nouvelles statistiques d'abonnement
-- 1. Essais 14 jours (nouveaux inscrits) vs 30 jours (anciens inscrits)
-- 2. Abonnements mensuels vs annuels
-- 3. Revenus détaillés
-- 4. Statistiques de conversion

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

  SELECT json_build_object(
    -- Utilisateurs totaux
    'total_users', (SELECT COUNT(*) FROM auth.users),
    
    -- === CHAUFFEURS ===
    'total_drivers', (SELECT COUNT(*) FROM public.drivers WHERE is_demo_account = false),
    'validated_drivers', (SELECT COUNT(*) FROM public.drivers WHERE status = 'validated' AND is_demo_account = false),
    'pending_drivers', (SELECT COUNT(*) FROM public.drivers WHERE status = 'pending' AND is_demo_account = false),
    
    -- === PIONNIERS ===
    'total_pioneers', (SELECT COUNT(*) FROM public.drivers WHERE is_pioneer = true AND is_demo_account = false),
    'validated_pioneers', (SELECT COUNT(*) FROM public.drivers WHERE is_pioneer = true AND status = 'validated' AND is_demo_account = false),
    'pending_pioneers', (SELECT COUNT(*) FROM public.drivers WHERE is_pioneer = true AND status = 'pending' AND is_demo_account = false),
    'pioneers_with_subscription', (SELECT COUNT(*) FROM public.drivers WHERE is_pioneer = true AND subscription_paid = true AND is_demo_account = false),
    'pioneers_in_trial', (SELECT COUNT(*) FROM public.drivers WHERE is_pioneer = true AND free_access_type = 'trial' AND is_demo_account = false),
    
    -- === ABONNEMENTS ACTIFS ===
    'active_subscriptions', (SELECT COUNT(*) FROM public.drivers WHERE subscription_status = 'active' AND is_demo_account = false),
    'monthly_subscriptions', (SELECT COUNT(*) FROM public.drivers WHERE subscription_status = 'active' AND subscription_type = 'monthly' AND is_demo_account = false),
    'annual_subscriptions', (SELECT COUNT(*) FROM public.drivers WHERE subscription_status = 'active' AND subscription_type = 'annual' AND is_demo_account = false),
    
    -- === ESSAIS GRATUITS ===
    -- Essais 14 jours (nouveaux inscrits depuis la mise à jour)
    'trials_14_days', (
      SELECT COUNT(*) FROM public.drivers 
      WHERE free_access_type = 'trial' 
      AND is_demo_account = false
      AND created_at >= '2026-01-20'::timestamp
    ),
    -- Essais 30 jours (anciens inscrits avant la mise à jour)
    'trials_30_days', (
      SELECT COUNT(*) FROM public.drivers 
      WHERE free_access_type = 'trial' 
      AND is_demo_account = false
      AND created_at < '2026-01-20'::timestamp
    ),
    -- Total en essai gratuit
    'total_trials', (
      SELECT COUNT(*) FROM public.drivers 
      WHERE free_access_type = 'trial' 
      AND is_demo_account = false
      AND (free_access_end_date IS NULL OR free_access_end_date > NOW())
    ),
    -- Essais expirés (sans conversion)
    'expired_trials', (
      SELECT COUNT(*) FROM public.drivers 
      WHERE free_access_type = 'trial' 
      AND is_demo_account = false
      AND free_access_end_date < NOW()
      AND subscription_status != 'active'
    ),
    
    -- === STATUTS D'ABONNEMENT ===
    'subscription_past_due', (SELECT COUNT(*) FROM public.drivers WHERE subscription_status = 'past_due' AND is_demo_account = false),
    'subscription_canceled', (SELECT COUNT(*) FROM public.drivers WHERE subscription_status = 'canceled' AND is_demo_account = false),
    'subscription_inactive', (
      SELECT COUNT(*) FROM public.drivers 
      WHERE (subscription_status IS NULL OR subscription_status = 'inactive')
      AND subscription_paid = false
      AND is_demo_account = false
    ),
    
    -- === REVENUS ===
    -- Revenu total (factures)
    'total_revenue', (
      SELECT COALESCE(SUM(f.amount), 0) FROM public.factures f 
      INNER JOIN public.drivers d ON f.driver_id = d.id 
      WHERE f.payment_status = 'paid' AND d.is_demo_account = false
    ),
    -- MRR estimé (Monthly Recurring Revenue)
    'mrr', (
      SELECT COALESCE(
        (SELECT COUNT(*) FROM public.drivers WHERE subscription_status = 'active' AND subscription_type = 'monthly' AND is_demo_account = false) * 9.99 +
        (SELECT COUNT(*) FROM public.drivers WHERE subscription_status = 'active' AND subscription_type = 'annual' AND is_demo_account = false) * (101.90 / 12),
        0
      )
    ),
    -- Revenus du mois en cours
    'revenue_this_month', (
      SELECT COALESCE(SUM(f.amount), 0) FROM public.factures f 
      INNER JOIN public.drivers d ON f.driver_id = d.id 
      WHERE f.payment_status = 'paid' 
      AND d.is_demo_account = false
      AND f.created_at >= date_trunc('month', CURRENT_DATE)
    ),
    
    -- === CLIENTS ===
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
    
    -- === COURSES ===
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
    
    -- === DEVIS ===
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
    
    -- === PROFILS PUBLICS ===
    'public_drivers', (
      SELECT COUNT(*) FROM public.drivers 
      WHERE public_profile_enabled = true AND is_demo_account = false
    ),
    
    -- === TAUX DE CONVERSION ===
    'trial_conversion_rate', (
      SELECT CASE 
        WHEN (SELECT COUNT(*) FROM public.drivers WHERE free_access_type = 'trial' AND is_demo_account = false AND free_access_end_date < NOW()) > 0
        THEN ROUND(
          (SELECT COUNT(*)::numeric FROM public.drivers WHERE free_access_type = 'trial' AND is_demo_account = false AND subscription_status = 'active') /
          (SELECT COUNT(*)::numeric FROM public.drivers WHERE free_access_type = 'trial' AND is_demo_account = false AND free_access_end_date < NOW()) * 100,
          1
        )
        ELSE 0
      END
    ),
    
    -- === INSCRIPTIONS RECENTES ===
    'new_drivers_this_week', (
      SELECT COUNT(*) FROM public.drivers 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      AND is_demo_account = false
    ),
    'new_drivers_this_month', (
      SELECT COUNT(*) FROM public.drivers 
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
      AND is_demo_account = false
    )
    
  ) INTO stats;

  RETURN stats;
END;
$function$;