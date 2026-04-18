-- 1) Mettre à jour la policy d'INSERT sur course_ratings pour inclure les créateurs/guests
DROP POLICY IF EXISTS "Clients can create ratings" ON public.course_ratings;

CREATE POLICY "Clients and guests can create ratings"
ON public.course_ratings
FOR INSERT
TO authenticated
WITH CHECK (
  -- Le client propriétaire de la course
  (client_id IN (SELECT clients.id FROM clients WHERE clients.user_id = auth.uid()))
  OR
  -- Le créateur de la course (utilisateur connecté ayant créé la réservation)
  (course_id IN (
    SELECT c.id FROM courses c
    WHERE c.created_by_user_id = auth.uid()
       OR c.guest_email = (SELECT email FROM auth.users WHERE id = auth.uid())
       OR c.guest_phone = (SELECT raw_user_meta_data->>'phone' FROM auth.users WHERE id = auth.uid())
  ))
  OR
  -- Le chauffeur peut noter le client (driver_to_client)
  (driver_id IN (SELECT drivers.id FROM drivers WHERE drivers.user_id = auth.uid()))
);

-- 2) Activer le cron pour l'auto-annulation des notes expirées (toutes les heures)
SELECT cron.unschedule('auto-cancel-expired-ratings-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-cancel-expired-ratings-hourly'
);

SELECT cron.schedule(
  'auto-cancel-expired-ratings-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://iyothopplhbwcfrpxryc.supabase.co/functions/v1/auto-cancel-expired-ratings',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5b3Rob3BwbGhid2NmcnB4cnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzI5MTUsImV4cCI6MjA3OTIwODkxNX0.qnFWbejy-Tp3HkvHPI-O_43-3hzp61hjGTrYfnnsdxQ"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 3) Cron pour déclencher l'arbitrage IA des notes contestées sans réponse client (toutes les 15 min)
-- Note: ai-rating-arbitration nécessite un ratingId, donc on appelle via une fonction wrapper
CREATE OR REPLACE FUNCTION public.trigger_ai_arbitration_for_pending_ratings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rating RECORD;
BEGIN
  -- Notes contestées dont le délai de réponse client est passé : déclencher l'arbitrage
  FOR _rating IN 
    SELECT id FROM course_ratings 
    WHERE status = 'contested'
      AND client_response_deadline IS NOT NULL
      AND client_response_deadline < now()
      AND ai_decision IS NULL
    LIMIT 50
  LOOP
    PERFORM net.http_post(
      url := 'https://iyothopplhbwcfrpxryc.supabase.co/functions/v1/ai-rating-arbitration',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5b3Rob3BwbGhid2NmcnB4cnljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MzI5MTUsImV4cCI6MjA3OTIwODkxNX0.qnFWbejy-Tp3HkvHPI-O_43-3hzp61hjGTrYfnnsdxQ"}'::jsonb,
      body := jsonb_build_object('ratingId', _rating.id)
    );
  END LOOP;
END;
$$;

SELECT cron.unschedule('ai-rating-arbitration-pending') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ai-rating-arbitration-pending'
);

SELECT cron.schedule(
  'ai-rating-arbitration-pending',
  '*/15 * * * *',
  $$SELECT public.trigger_ai_arbitration_for_pending_ratings();$$
);