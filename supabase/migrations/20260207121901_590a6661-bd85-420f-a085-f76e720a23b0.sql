-- Ajouter la colonne last_seen_at pour tracker la dernière connexion
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

-- Créer un index pour des requêtes rapides
CREATE INDEX IF NOT EXISTS idx_drivers_last_seen_at ON public.drivers(last_seen_at DESC);

-- Supprimer l'ancienne fonction et recréer
DROP FUNCTION IF EXISTS public.get_admin_drivers_with_stats();

CREATE FUNCTION public.get_admin_drivers_with_stats()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  company_name TEXT,
  created_at TIMESTAMPTZ,
  subscription_status TEXT,
  subscription_paid BOOLEAN,
  has_nfc_plate BOOLEAN,
  nfc_plate_ordered_at TIMESTAMPTZ,
  vehicle_brand TEXT,
  vehicle_plate TEXT,
  base_fare NUMERIC,
  per_km_rate NUMERIC,
  siret TEXT,
  status TEXT,
  documents_status TEXT,
  profile_photo_url TEXT,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  free_access_granted BOOLEAN,
  billing_type TEXT,
  stripe_connect_status TEXT,
  trial_started_at TIMESTAMPTZ,
  trial_status TEXT,
  objectives_completed BOOLEAN,
  onboarding_objectives_completed BOOLEAN,
  onboarding_settings_completed BOOLEAN,
  onboarding_profile_completed BOOLEAN,
  onboarding_documents_completed BOOLEAN,
  onboarding_step TEXT,
  onboarding_completed BOOLEAN,
  last_seen_at TIMESTAMPTZ,
  total_courses BIGINT,
  total_clients BIGINT,
  total_scans BIGINT,
  last_activity TIMESTAMPTZ,
  first_course_at TIMESTAMPTZ,
  first_scan_at TIMESTAMPTZ,
  first_client_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    d.status,
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
    COALESCE(d.onboarding_step, 'vision') as onboarding_step,
    COALESCE(d.onboarding_completed, false) as onboarding_completed,
    d.last_seen_at,
    COALESCE((SELECT COUNT(*) FROM courses c WHERE c.driver_id = d.id), 0) as total_courses,
    COALESCE((SELECT COUNT(*) FROM clients cl WHERE cl.driver_id = d.id), 0) as total_clients,
    COALESCE((SELECT COUNT(*) FROM qr_code_scans qs JOIN qr_codes qc ON qs.qr_code_id = qc.id WHERE qc.driver_id = d.id), 0) as total_scans,
    (SELECT MAX(c.created_at) FROM courses c WHERE c.driver_id = d.id) as last_activity,
    (SELECT MIN(c.created_at) FROM courses c WHERE c.driver_id = d.id) as first_course_at,
    (SELECT MIN(qs.scanned_at) FROM qr_code_scans qs JOIN qr_codes qc ON qs.qr_code_id = qc.id WHERE qc.driver_id = d.id) as first_scan_at,
    (SELECT MIN(cl.created_at) FROM clients cl WHERE cl.driver_id = d.id) as first_client_at
  FROM drivers d
  LEFT JOIN profiles p ON d.user_id = p.id
  WHERE d.is_demo_account = false
  ORDER BY d.created_at DESC
  LIMIT 100;
END;
$$;