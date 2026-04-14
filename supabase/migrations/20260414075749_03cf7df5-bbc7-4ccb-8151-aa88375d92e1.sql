
-- FIX 1: Guest booking data exposure
DROP POLICY IF EXISTS "Guests can view their course via tracking token" ON public.courses;

CREATE OR REPLACE FUNCTION public.get_guest_course_by_token(p_token uuid)
RETURNS TABLE (
  id uuid,
  status text,
  pickup_address text,
  destination_address text,
  scheduled_date timestamptz,
  guest_name text,
  guest_phone text,
  driver_id uuid,
  driver_name text,
  driver_phone text,
  driver_photo_url text,
  vehicle_brand text,
  vehicle_model text,
  vehicle_color text,
  vehicle_plate text,
  final_payment_amount numeric,
  payment_method text,
  is_guest_booking boolean,
  guest_tracking_token uuid,
  course_number text,
  pickup_latitude double precision,
  pickup_longitude double precision,
  destination_latitude double precision,
  destination_longitude double precision,
  created_at timestamptz,
  updated_at timestamptz,
  estimated_distance_km numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id, c.status, c.pickup_address, c.destination_address, c.scheduled_date,
    c.guest_name, c.guest_phone, c.driver_id,
    p.full_name, p.phone, p.profile_photo_url,
    d.vehicle_brand, d.vehicle_model, d.vehicle_color, d.vehicle_plate,
    c.final_payment_amount, c.payment_method, c.is_guest_booking, c.guest_tracking_token,
    c.course_number, c.pickup_latitude, c.pickup_longitude,
    c.destination_latitude, c.destination_longitude,
    c.created_at, c.updated_at, c.distance_km
  FROM courses c
  LEFT JOIN drivers d ON d.id = c.driver_id
  LEFT JOIN profiles p ON p.id = d.user_id
  WHERE c.guest_tracking_token = p_token 
    AND c.is_guest_booking = true
    AND p_token IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_course_by_token(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_guest_course_by_token(uuid) TO authenticated;

-- FIX 2: Company-documents storage policies
DROP POLICY IF EXISTS "Companies can delete their logos" ON storage.objects;
DROP POLICY IF EXISTS "Companies can update their logos" ON storage.objects;
DROP POLICY IF EXISTS "Companies can upload their logos" ON storage.objects;
DROP POLICY IF EXISTS "Companies can upload payment documents" ON storage.objects;

CREATE POLICY "Company owners can upload their documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Company owners can update their documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Company owners can delete their documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Company owners can upload payment documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM companies WHERE user_id = auth.uid()));

-- FIX 3: QR codes - drop and recreate view with fewer columns
DROP VIEW IF EXISTS public.qr_codes_public;

DROP POLICY IF EXISTS "Public can scan active QR codes" ON public.qr_codes;

CREATE VIEW public.qr_codes_public WITH (security_invoker = on)
AS SELECT id, code, is_active FROM public.qr_codes WHERE is_active = true;

GRANT SELECT ON public.qr_codes_public TO anon;
GRANT SELECT ON public.qr_codes_public TO authenticated;

CREATE POLICY "Public can read active QR code and id only"
ON public.qr_codes FOR SELECT TO anon USING (is_active = true);
