
CREATE OR REPLACE FUNCTION get_admin_drivers_with_stats()
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
  vehicle_plate text,
  base_fare numeric,
  per_km_rate numeric,
  siret text,
  status text,
  documents_status text,
  profile_photo_url text,
  full_name text,
  phone text,
  email text,
  free_access_granted boolean,
  billing_type text,
  stripe_connect_status text,
  trial_started_at timestamptz,
  trial_status text,
  objectives_completed boolean,
  onboarding_objectives_completed boolean,
  onboarding_settings_completed boolean,
  onboarding_profile_completed boolean,
  onboarding_documents_completed boolean,
  onboarding_step text,
  onboarding_completed boolean,
  last_seen_at timestamptz,
  total_courses bigint,
  total_clients bigint,
  total_scans bigint,
  last_activity timestamptz,
  first_course_at timestamptz,
  first_scan_at timestamptz,
  first_client_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
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
    d.vehicle_plate,
    d.base_fare,
    d.per_km_rate,
    d.siret,
    d.status::text,
    d.documents_status,
    p.profile_photo_url,
    COALESCE(p.full_name, 'Non renseigné') as full_name,
    p.phone,
    COALESCE(p.email, 'email@inconnu.com') as email,
    d.free_access_granted,
    d.billing_type,
    d.stripe_connect_status,
    d.trial_activated_at as trial_started_at,
    d.trial_status,
    d.objectives_completed,
    d.onboarding_objectives_completed,
    COALESCE(d.onboarding_settings_completed, false) as onboarding_settings_completed,
    COALESCE(d.onboarding_profile_completed, false) as onboarding_profile_completed,
    COALESCE(d.onboarding_documents_completed, false) as onboarding_documents_completed,
    COALESCE(d.onboarding_step::text, 'vision') as onboarding_step,
    COALESCE(d.onboarding_completed, false) as onboarding_completed,
    d.last_seen_at,
    -- Courses: include driver_ids array
    COALESCE((SELECT COUNT(*) FROM courses c WHERE c.driver_id = d.id OR d.id = ANY(c.driver_ids)), 0) as total_courses,
    -- Clients: include driver_ids array
    COALESCE((SELECT COUNT(*) FROM clients cl WHERE cl.driver_id = d.id OR d.id = ANY(cl.driver_ids)), 0) as total_clients,
    -- Scans: sum from qr_codes
    COALESCE((SELECT SUM(qc.scans_count) FROM qr_codes qc WHERE qc.driver_id = d.id), 0)::bigint as total_scans,
    -- Last activity: include driver_ids
    (SELECT MAX(c.created_at) FROM courses c WHERE c.driver_id = d.id OR d.id = ANY(c.driver_ids)) as last_activity,
    -- First course: include driver_ids
    (SELECT MIN(c.created_at) FROM courses c WHERE c.driver_id = d.id OR d.id = ANY(c.driver_ids)) as first_course_at,
    -- First scan with actual scans
    (SELECT MIN(qc.created_at) FROM qr_codes qc WHERE qc.driver_id = d.id AND qc.scans_count > 0) as first_scan_at,
    -- First client: include driver_ids
    (SELECT MIN(cl.created_at) FROM clients cl WHERE cl.driver_id = d.id OR d.id = ANY(cl.driver_ids)) as first_client_at
  FROM drivers d
  LEFT JOIN profiles p ON d.user_id = p.id
  WHERE d.is_demo_account = false
  ORDER BY d.created_at DESC
  LIMIT 100;
END;
$$;
