-- Optimized RPC function to get all driver data with stats in ONE query
-- This replaces the N+1 query pattern that was causing slow loading

CREATE OR REPLACE FUNCTION public.get_admin_drivers_with_stats()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  company_name text,
  created_at timestamptz,
  subscription_status text,
  subscription_paid boolean,
  has_nfc_plate boolean,
  nfc_plate_ordered_at timestamptz,
  vehicle_brand text,
  vehicle_model text,
  vehicle_plate text,
  vehicle_color text,
  base_fare numeric,
  per_km_rate numeric,
  hourly_rate numeric,
  working_sectors text[],
  service_description text,
  siret text,
  company_address text,
  max_passengers integer,
  registration_step integer,
  status text,
  documents_status text,
  profile_photo_url text,
  full_name text,
  phone text,
  email text,
  free_access_granted boolean,
  billing_type text,
  stripe_connect_status text,
  wants_tpe_affiliate boolean,
  tpe_received_at timestamptz,
  trial_started_at timestamptz,
  trial_ready_to_start boolean,
  objectives_completed boolean,
  onboarding_objectives_completed boolean,
  onboarding_step text,
  -- Stats aggregated
  total_courses bigint,
  total_clients bigint,
  total_scans bigint,
  last_activity timestamptz,
  first_course_at timestamptz,
  first_scan_at timestamptz,
  first_client_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    d.user_id,
    d.company_name,
    d.created_at,
    d.subscription_status,
    d.subscription_paid,
    d.has_nfc_plate,
    d.nfc_plate_ordered_at,
    d.vehicle_brand,
    d.vehicle_model,
    d.vehicle_plate,
    d.vehicle_color,
    d.base_fare,
    d.per_km_rate,
    d.hourly_rate,
    d.working_sectors,
    d.service_description,
    d.siret,
    d.company_address,
    d.max_passengers,
    d.registration_step,
    d.status,
    d.documents_status,
    p.profile_photo_url,
    COALESCE(p.full_name, 'Non renseigné') as full_name,
    p.phone,
    COALESCE(p.email, 'email@inconnu.com') as email,
    d.free_access_granted,
    d.billing_type,
    d.stripe_connect_status,
    COALESCE(d.wants_tpe_affiliate, false) as wants_tpe_affiliate,
    d.tpe_received_at,
    COALESCE(d.trial_started_at, d.trial_activated_at) as trial_started_at,
    COALESCE(d.trial_ready_to_start, false) as trial_ready_to_start,
    COALESCE(d.objectives_completed, false) as objectives_completed,
    COALESCE(d.onboarding_objectives_completed, false) as onboarding_objectives_completed,
    d.onboarding_step,
    -- Stats with subqueries (more efficient than joins for aggregates)
    COALESCE((SELECT COUNT(*) FROM courses c WHERE c.driver_id = d.id), 0) as total_courses,
    COALESCE((SELECT COUNT(*) FROM clients cl WHERE cl.driver_id = d.id), 0) as total_clients,
    COALESCE((SELECT COUNT(*) FROM qr_codes q WHERE q.driver_id = d.id), 0) as total_scans,
    (SELECT MAX(c.created_at) FROM courses c WHERE c.driver_id = d.id) as last_activity,
    (SELECT MIN(c.created_at) FROM courses c WHERE c.driver_id = d.id) as first_course_at,
    (SELECT MIN(q.created_at) FROM qr_codes q WHERE q.driver_id = d.id) as first_scan_at,
    (SELECT MIN(cl.created_at) FROM clients cl WHERE cl.driver_id = d.id) as first_client_at
  FROM drivers d
  LEFT JOIN profiles p ON p.id = d.user_id
  WHERE COALESCE(d.is_demo_account, false) = false
  ORDER BY d.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_admin_drivers_with_stats() TO authenticated;