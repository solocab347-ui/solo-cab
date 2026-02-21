
-- Mise à jour du prix d'abonnement dans get_platform_stats: 9.99€ → 29.99€
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
  annual_sub_count INT;
  monthly_sub_count INT;
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
  
  -- Abonnements actifs par type
  SELECT COUNT(*) INTO monthly_sub_count FROM drivers 
    WHERE subscription_status = 'active' AND subscription_paid = true AND free_access_granted = false AND is_demo_account = false
    AND (subscription_plan IS NULL OR subscription_plan != 'annual');
  SELECT COUNT(*) INTO annual_sub_count FROM drivers 
    WHERE subscription_status = 'active' AND subscription_paid = true AND free_access_granted = false AND is_demo_account = false
    AND subscription_plan = 'annual';
  
  active_subscription_count := monthly_sub_count + annual_sub_count;
  
  SELECT COUNT(*) INTO inactive_subscription_count FROM drivers 
    WHERE status = 'validated' AND (subscription_paid = false OR subscription_status != 'active') AND free_access_granted = false AND is_demo_account = false;
  
  SELECT COUNT(*) INTO new_drivers_week FROM drivers 
    WHERE created_at >= NOW() - INTERVAL '7 days' AND is_demo_account = false;
  SELECT COUNT(*) INTO new_drivers_month FROM drivers 
    WHERE created_at >= DATE_TRUNC('month', NOW()) AND is_demo_account = false;
  SELECT COUNT(*) INTO public_drivers_count FROM drivers 
    WHERE public_profile_enabled = true AND status = 'validated' AND is_demo_account = false;
  
  -- MRR: 29.99€/mois pour mensuels + 305.90€/12 pour annuels
  mrr_value := (monthly_sub_count * 29.99) + (annual_sub_count * ROUND(305.90 / 12, 2));
  
  SELECT COUNT(*) INTO total_clients_count FROM clients;
  SELECT COUNT(*) INTO exclusive_clients_count FROM clients WHERE is_exclusive = true;
  SELECT COUNT(*) INTO free_clients_count FROM clients WHERE is_exclusive = false;
  SELECT COUNT(*) INTO total_companies_count FROM companies;
  SELECT COUNT(*) INTO total_fleet_managers_count FROM fleet_managers;
  SELECT COUNT(*) INTO total_courses_count FROM courses;
  SELECT COUNT(*) INTO completed_courses_count FROM courses WHERE status = 'completed';
  SELECT COUNT(*) INTO total_devis_count FROM devis;
  SELECT COUNT(*) INTO accepted_devis_count FROM devis WHERE status = 'accepted';
  SELECT COUNT(*), COALESCE(SUM(amount), 0) INTO total_factures_count, paid_factures_total 
    FROM factures WHERE payment_status = 'paid';
  
  result := json_build_object(
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
    'total_trials', trial_drivers_count,
    'trials_14_days', trial_drivers_count,
    'trials_30_days', 0,
    'expired_trials', (SELECT COUNT(*) FROM drivers WHERE free_access_type = 'trial' AND free_access_end_date < NOW() AND subscription_paid = false AND is_demo_account = false),
    'subscription_past_due', (SELECT COUNT(*) FROM drivers WHERE subscription_status = 'past_due' AND is_demo_account = false),
    'subscription_canceled', (SELECT COUNT(*) FROM drivers WHERE subscription_status = 'canceled' AND is_demo_account = false),
    'trial_conversion_rate', CASE WHEN trial_drivers_count > 0 THEN ROUND((paying_drivers_count::NUMERIC / trial_drivers_count) * 100, 1) ELSE 0 END,
    'mrr', mrr_value,
    'monthly_subscriptions', monthly_sub_count,
    'annual_subscriptions', annual_sub_count,
    'revenue_this_month', mrr_value,
    'total_revenue', paid_factures_total,
    'total_clients', total_clients_count,
    'exclusive_clients', exclusive_clients_count,
    'free_clients', free_clients_count,
    'total_users', total_drivers_count + total_clients_count + total_companies_count + total_fleet_managers_count,
    'total_companies', total_companies_count,
    'total_fleet_managers', total_fleet_managers_count,
    'total_courses', total_courses_count,
    'completed_courses', completed_courses_count,
    'total_devis', total_devis_count,
    'accepted_devis', accepted_devis_count,
    'total_factures', total_factures_count,
    'paid_factures_total', paid_factures_total
  );
  
  RETURN result;
END;
$$;
