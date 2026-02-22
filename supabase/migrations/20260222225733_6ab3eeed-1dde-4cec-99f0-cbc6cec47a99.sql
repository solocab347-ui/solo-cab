CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  total_drivers_count INT;
  validated_drivers_count INT;
  pending_drivers_count INT;
  on_hold_drivers_count INT;
  pioneer_drivers_count INT;
  paying_drivers_count INT;
  free_access_drivers_count INT;
  trial_drivers_count INT;
  active_subscription_count INT;
  inactive_subscription_count INT;
  total_clients_count INT;
  exclusive_clients_count INT;
  free_clients_count INT;
  total_companies_count INT;
  total_fleet_managers_count INT;
  total_courses_count INT;
  completed_courses_count INT;
  total_devis_count INT;
  accepted_devis_count INT;
  total_factures_count INT;
  paid_factures_total NUMERIC;
  mrr_value NUMERIC;
  new_drivers_week INT;
  new_drivers_month INT;
  public_drivers_count INT;
BEGIN
  SELECT COUNT(*) INTO total_drivers_count FROM drivers WHERE is_demo_account = false;
  SELECT COUNT(*) INTO validated_drivers_count FROM drivers WHERE status = 'validated' AND is_demo_account = false;
  SELECT COUNT(*) INTO pending_drivers_count FROM drivers WHERE status = 'pending' AND is_demo_account = false;
  SELECT COUNT(*) INTO on_hold_drivers_count FROM drivers WHERE status = 'on_hold' AND is_demo_account = false;
  SELECT COUNT(*) INTO pioneer_drivers_count FROM drivers WHERE is_pioneer = true AND is_demo_account = false;
  SELECT COUNT(*) INTO paying_drivers_count FROM drivers 
    WHERE subscription_paid = true AND free_access_granted = false AND is_demo_account = false;
  SELECT COUNT(*) INTO free_access_drivers_count FROM drivers 
    WHERE free_access_granted = true AND is_demo_account = false;
  SELECT COUNT(*) INTO trial_drivers_count FROM drivers 
    WHERE free_access_type = 'trial' AND is_demo_account = false;
  
  -- Abonnements actifs (sans référence à subscription_plan qui n'existe plus)
  SELECT COUNT(*) INTO active_subscription_count FROM drivers 
    WHERE subscription_status = 'active' AND subscription_paid = true AND free_access_granted = false AND is_demo_account = false;
  
  SELECT COUNT(*) INTO inactive_subscription_count FROM drivers 
    WHERE status = 'validated' AND (subscription_paid = false OR subscription_status != 'active') AND free_access_granted = false AND is_demo_account = false;
  
  SELECT COUNT(*) INTO new_drivers_week FROM drivers 
    WHERE created_at >= NOW() - INTERVAL '7 days' AND is_demo_account = false;
  SELECT COUNT(*) INTO new_drivers_month FROM drivers 
    WHERE created_at >= DATE_TRUNC('month', NOW()) AND is_demo_account = false;
  SELECT COUNT(*) INTO public_drivers_count FROM drivers 
    WHERE public_profile_enabled = true AND status = 'validated' AND is_demo_account = false;
  
  -- MRR: tous les abonnés actifs à 29.99€/mois
  mrr_value := active_subscription_count * 29.99;
  
  SELECT COUNT(*) INTO total_clients_count FROM clients;
  SELECT COUNT(*) INTO exclusive_clients_count FROM clients WHERE is_exclusive = true;
  SELECT COUNT(*) INTO free_clients_count FROM clients WHERE is_exclusive = false;
  SELECT COUNT(*) INTO total_companies_count FROM companies;
  SELECT COUNT(*) INTO total_fleet_managers_count FROM fleet_managers;
  SELECT COUNT(*) INTO total_courses_count FROM courses;
  SELECT COUNT(*) INTO completed_courses_count FROM courses WHERE status = 'completed';
  SELECT COUNT(*) INTO total_devis_count FROM devis;
  SELECT COUNT(*) INTO accepted_devis_count FROM devis WHERE status = 'accepted';

  SELECT json_build_object(
    'total_drivers', total_drivers_count,
    'validated_drivers', validated_drivers_count,
    'pending_drivers', pending_drivers_count,
    'on_hold_drivers', on_hold_drivers_count,
    'new_drivers_this_week', new_drivers_week,
    'new_drivers_this_month', new_drivers_month,
    'public_drivers', public_drivers_count,
    'total_pioneers', pioneer_drivers_count,
    'validated_pioneers', (SELECT COUNT(*) FROM drivers WHERE is_pioneer = true AND status = 'validated' AND is_demo_account = false),
    'pending_pioneers', (SELECT COUNT(*) FROM drivers WHERE is_pioneer = true AND status = 'pending' AND is_demo_account = false),
    'pioneers_in_trial', (SELECT COUNT(*) FROM drivers WHERE is_pioneer = true AND free_access_type = 'trial' AND is_demo_account = false),
    'pioneers_with_subscription', (SELECT COUNT(*) FROM drivers WHERE is_pioneer = true AND subscription_paid = true AND is_demo_account = false),
    'active_subscriptions', active_subscription_count,
    'inactive_subscriptions', inactive_subscription_count,
    'paying_drivers', paying_drivers_count,
    'free_access_drivers', free_access_drivers_count,
    'trial_drivers', trial_drivers_count,
    'mrr', mrr_value,
    'total_clients', total_clients_count,
    'exclusive_clients', exclusive_clients_count,
    'free_clients', free_clients_count,
    'total_users', (SELECT COUNT(*) FROM profiles),
    'total_companies', total_companies_count,
    'total_fleet_managers', total_fleet_managers_count,
    'total_courses', total_courses_count,
    'completed_courses', completed_courses_count,
    'total_devis', total_devis_count,
    'accepted_devis', accepted_devis_count
  ) INTO result;
  
  RETURN result;
END;
$$;