
-- =============================================
-- 1. FIX: Fleet-documents storage scoping
-- =============================================

DROP POLICY IF EXISTS "Fleet managers can view their documents" ON storage.objects;
DROP POLICY IF EXISTS "Fleet managers can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Fleet managers can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Fleet managers can delete their documents" ON storage.objects;

CREATE POLICY "Fleet managers can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'fleet-documents'
  AND auth.uid() IN (
    SELECT fm.user_id FROM public.fleet_managers fm
    WHERE fm.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Fleet managers can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fleet-documents'
  AND auth.uid() IN (
    SELECT fm.user_id FROM public.fleet_managers fm
    WHERE fm.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Fleet managers can update their own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'fleet-documents'
  AND auth.uid() IN (
    SELECT fm.user_id FROM public.fleet_managers fm
    WHERE fm.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Fleet managers can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'fleet-documents'
  AND auth.uid() IN (
    SELECT fm.user_id FROM public.fleet_managers fm
    WHERE fm.id::text = (storage.foldername(name))[1]
  )
);

-- =============================================
-- 2. FIX: Safe driver profiles view (no sensitive data)
-- =============================================

DROP VIEW IF EXISTS public.safe_driver_profiles;
CREATE VIEW public.safe_driver_profiles WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  display_driver_name,
  display_company_name,
  company_name,
  bio,
  service_description,
  card_photo_url,
  gallery_photos,
  vehicle_photos,
  rating,
  total_rides,
  vehicle_brand,
  vehicle_model,
  vehicle_year,
  vehicle_color,
  vehicle_plate,
  vehicle_category,
  vehicle_equipment,
  max_passengers,
  public_profile_enabled,
  visible_to_companies,
  visible_to_fleet_managers,
  visible_to_drivers,
  services_offered,
  working_sectors,
  accepted_payment_methods,
  show_payment_methods_publicly,
  show_phone,
  show_email,
  show_rating_public,
  show_rating_partners,
  show_pricing_partners,
  show_rating_for_sharing,
  show_rides_for_sharing,
  show_phone_for_sharing,
  is_pioneer,
  subscription_status,
  subscription_paid,
  status,
  sharing_available,
  sharing_number,
  created_at
FROM public.drivers;

GRANT SELECT ON public.safe_driver_profiles TO authenticated, anon;

-- =============================================
-- 3. FIX: Safe client profiles view (no payment data)
-- =============================================

DROP VIEW IF EXISTS public.safe_client_profiles;
CREATE VIEW public.safe_client_profiles WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  driver_id,
  driver_ids,
  fleet_manager_id,
  is_exclusive,
  favorite_driver_id,
  preferred_fleet_driver_id,
  qr_code_id,
  reliability_score,
  total_rides,
  total_spent,
  total_ratings_given,
  abusive_ratings_count,
  created_at,
  updated_at
FROM public.clients;

GRANT SELECT ON public.safe_client_profiles TO authenticated;
