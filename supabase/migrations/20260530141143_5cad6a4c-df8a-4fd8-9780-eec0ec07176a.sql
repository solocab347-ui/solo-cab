
-- 1. Remove anon UPDATE policy on ride_requests (leaks guest PII via USING). Guest cancellation must go through an edge function with tracking token.
DROP POLICY IF EXISTS "Anon can cancel their ride requests" ON public.ride_requests;

-- Explicit deny for anon SELECT on ride_requests (defense-in-depth)
DROP POLICY IF EXISTS "Deny anon select on ride_requests" ON public.ride_requests;
CREATE POLICY "Deny anon select on ride_requests"
  ON public.ride_requests
  FOR SELECT
  TO anon
  USING (false);

-- 2. Restrict client_can_view_course: only client_id / created_by_user_id; remove guest_email/phone matching
CREATE OR REPLACE FUNCTION public.client_can_view_course(course_row public.courses)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM clients c
    WHERE c.user_id = auth.uid()
      AND (
        course_row.client_id = c.id
        OR course_row.created_by_user_id = c.user_id
      )
  );
$function$;

-- 3. driver-documents storage: align folder to driver_id (matching driver_documents table FK)
DROP POLICY IF EXISTS "Drivers can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Drivers can view their own documents" ON storage.objects;

CREATE POLICY "Drivers can upload their own documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'driver-documents'
    AND public.get_driver_id(auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Drivers can view their own documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND (
      public.get_driver_id(auth.uid())::text = (storage.foldername(name))[1]
      OR (auth.uid())::text = (storage.foldername(name))[1] -- backward compat for legacy files
    )
  );

CREATE POLICY "Drivers can update their own documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND public.get_driver_id(auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Drivers can delete their own documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND public.get_driver_id(auth.uid())::text = (storage.foldername(name))[1]
  );

-- 4. payment-proofs: add admin SELECT for audit
DROP POLICY IF EXISTS "Admins can view all payment proofs" ON storage.objects;
CREATE POLICY "Admins can view all payment proofs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND public.has_role(auth.uid(), 'admin')
  );
