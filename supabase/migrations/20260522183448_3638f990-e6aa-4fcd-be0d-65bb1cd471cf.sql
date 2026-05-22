
-- 1. geocoding_cache: restrict SELECT to admins (edge functions use service role and bypass RLS)
DROP POLICY IF EXISTS "Authenticated users can read geocoding cache" ON public.geocoding_cache;
CREATE POLICY "Admins can read geocoding cache"
ON public.geocoding_cache
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. system_settings: restrict SELECT to admins
DROP POLICY IF EXISTS "Authenticated users can read system settings" ON public.system_settings;
CREATE POLICY "Admins can read system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role
  )
);

-- 3. ride_requests: remove anon SELECT exposing guest PII
DROP POLICY IF EXISTS "Anon can view recent ride requests" ON public.ride_requests;

-- 4. podcast-audio storage: enforce driver-folder ownership on writes
DROP POLICY IF EXISTS "Authenticated users can upload podcast audio" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update podcast audio" ON storage.objects;

CREATE POLICY "Drivers can upload to own podcast audio folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'podcast-audio'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = public.get_driver_id(auth.uid())::text
);

CREATE POLICY "Drivers can update own podcast audio folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'podcast-audio'
  AND (storage.foldername(name))[1] = public.get_driver_id(auth.uid())::text
)
WITH CHECK (
  bucket_id = 'podcast-audio'
  AND (storage.foldername(name))[1] = public.get_driver_id(auth.uid())::text
);

CREATE POLICY "Drivers can delete own podcast audio folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'podcast-audio'
  AND (storage.foldername(name))[1] = public.get_driver_id(auth.uid())::text
);

-- 5. push_delivery_logs: restrict INSERT to service_role (backend) only
DROP POLICY IF EXISTS "Service writes push logs" ON public.push_delivery_logs;
CREATE POLICY "Service role writes push logs"
ON public.push_delivery_logs
FOR INSERT
TO service_role
WITH CHECK (true);
