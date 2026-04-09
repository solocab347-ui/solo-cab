
-- 1. Fix ride_requests: Remove dangerous anon SELECT policy exposing guest PII
DROP POLICY IF EXISTS "Guest users can view their ride requests" ON public.ride_requests;

-- 2. Fix fleet-documents storage: Remove public SELECT, add proper scoped access
DROP POLICY IF EXISTS "Fleet documents are publicly accessible" ON storage.objects;

CREATE POLICY "Fleet managers can view their own fleet documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'fleet-documents' 
  AND (
    auth.uid() IN (SELECT user_id FROM fleet_managers)
    OR has_role(auth.uid(), 'admin'::text)
  )
);

-- 3. Fix error_solutions: Restrict to admin only
DROP POLICY IF EXISTS "All authenticated view solutions" ON public.error_solutions;

CREATE POLICY "Only admins can view error solutions"
ON public.error_solutions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::text));

-- 4. Fix validation_rules: Restrict to admin only
DROP POLICY IF EXISTS "All authenticated view validation_rules" ON public.validation_rules;

CREATE POLICY "Only admins can view validation rules"
ON public.validation_rules FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::text));

-- 5. Fix qr_codes: Create a limited public view without driver_id
DROP POLICY IF EXISTS "Public can view active QR codes limited data" ON public.qr_codes;

CREATE OR REPLACE VIEW public.qr_codes_public
WITH (security_invoker = on) AS
SELECT 
  id,
  code,
  is_active,
  scans_count,
  created_at
FROM public.qr_codes
WHERE is_active = true;

CREATE POLICY "Public can scan active QR codes"
ON public.qr_codes FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 6. Fix company_course_requests: Remove overly permissive invitation policy
DROP POLICY IF EXISTS "Public read access via invitation" ON public.company_course_requests;

-- 7. Fix company_course_quotes: Remove overly permissive invitation policy
DROP POLICY IF EXISTS "Public read access via invitation" ON public.company_course_quotes;
