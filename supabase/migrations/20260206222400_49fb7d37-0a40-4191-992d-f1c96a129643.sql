
-- Create a SECURITY DEFINER function for admin to fetch all drivers with profiles
-- This bypasses RLS since admin verification is done inside the function

CREATE OR REPLACE FUNCTION public.get_admin_drivers_progression()
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
  full_name text,
  profile_photo_url text,
  phone text,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
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
    d.status::text,
    d.documents_status,
    d.free_access_granted,
    d.billing_type,
    d.stripe_connect_status,
    d.wants_tpe_affiliate,
    d.tpe_received_at,
    d.trial_started_at,
    d.trial_ready_to_start,
    d.objectives_completed,
    d.onboarding_objectives_completed,
    d.onboarding_step,
    COALESCE(p.full_name, 'Non renseigné') as full_name,
    p.profile_photo_url,
    p.phone,
    COALESCE(p.email, 'email@inconnu.com') as email
  FROM drivers d
  LEFT JOIN profiles p ON d.user_id = p.id
  WHERE d.is_demo_account = false
  ORDER BY d.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks admin role)
GRANT EXECUTE ON FUNCTION public.get_admin_drivers_progression() TO authenticated;
