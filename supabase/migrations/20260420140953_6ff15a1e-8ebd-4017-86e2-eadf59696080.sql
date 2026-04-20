-- 1) Fix mutable search_path on user-defined function
CREATE OR REPLACE FUNCTION public.set_failed_transfers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2) Restrict public access to fleet_manager_qr_codes and company_qr_codes
DROP POLICY IF EXISTS "Public can view active fleet manager QR codes" ON public.fleet_manager_qr_codes;
DROP POLICY IF EXISTS "Public can view active company QR codes" ON public.company_qr_codes;

CREATE POLICY "Authenticated users can view active fleet manager QR codes"
ON public.fleet_manager_qr_codes
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Authenticated users can view active company QR codes"
ON public.company_qr_codes
FOR SELECT
TO authenticated
USING (is_active = true);

-- 3) Add RLS to realtime.messages so authenticated users cannot subscribe
-- to arbitrary channel topics. Scope topic access by user context.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_users_own_topics" ON realtime.messages;
CREATE POLICY "authenticated_users_own_topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
  OR realtime.topic() IN (
    'driver-locations',
    'public-availability',
    'system-announcements'
  )
  OR EXISTS (
    SELECT 1 FROM public.courses c
    WHERE realtime.topic() LIKE '%' || c.id::text || '%'
      AND (
        c.client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
        OR c.driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
      )
  )
);

DROP POLICY IF EXISTS "authenticated_users_broadcast" ON realtime.messages;
CREATE POLICY "authenticated_users_broadcast"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
  OR realtime.topic() IN (
    'driver-locations',
    'public-availability'
  )
  OR EXISTS (
    SELECT 1 FROM public.courses c
    WHERE realtime.topic() LIKE '%' || c.id::text || '%'
      AND (
        c.client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
        OR c.driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
      )
  )
);