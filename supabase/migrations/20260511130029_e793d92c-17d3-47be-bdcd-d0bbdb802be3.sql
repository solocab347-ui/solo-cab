
-- =======================================================
-- VAGUE SÉCU-A : Hardening RLS critique
-- =======================================================

-- 1) STORAGE : profile-photos — restreindre UPDATE/DELETE au propriétaire
DROP POLICY IF EXISTS "Authenticated users can delete profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile photos" ON storage.objects;

-- (Les policies "Users can ... their own profile photo" existent déjà et restent en place)

-- 2) STORAGE : fleet-documents — supprimer la règle trop permissive sur les logos
DROP POLICY IF EXISTS "Fleet managers can upload their logos" ON storage.objects;

-- (La policy "Fleet managers can upload their own documents" reste en place et impose le folder = fleet_manager.id)

-- 3) course_queue — restreindre INSERT au chauffeur propriétaire
DROP POLICY IF EXISTS "Authenticated can insert queue items" ON public.course_queue;

CREATE POLICY "Drivers can insert their own queue items"
ON public.course_queue
FOR INSERT
TO authenticated
WITH CHECK (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4) auto_fix_logs — réservé aux admins
DROP POLICY IF EXISTS "Authenticated can insert auto_fix_logs" ON public.auto_fix_logs;

CREATE POLICY "Admins can insert auto_fix_logs"
ON public.auto_fix_logs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5) dispatch_metrics — réservé aux admins
DROP POLICY IF EXISTS "Authenticated users can log dispatch metrics" ON public.dispatch_metrics;

CREATE POLICY "Admins can log dispatch metrics"
ON public.dispatch_metrics
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6) fleet_course_escalations — seul le fleet manager concerné peut créer
DROP POLICY IF EXISTS "Authenticated can insert escalations" ON public.fleet_course_escalations;

CREATE POLICY "Fleet managers can create their own escalations"
ON public.fleet_course_escalations
FOR INSERT
TO authenticated
WITH CHECK (
  fleet_manager_id IN (SELECT id FROM public.fleet_managers WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 7) nfc_plate_orders — le client propriétaire peut voir sa propre commande
CREATE POLICY "Owners can view their own plate orders"
ON public.nfc_plate_orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
