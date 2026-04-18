-- Recréer la policy d'INSERT sur course_ratings sans accéder à auth.users (qui est protégé)
DROP POLICY IF EXISTS "Clients and guests can create ratings" ON public.course_ratings;
DROP POLICY IF EXISTS "Clients can create ratings" ON public.course_ratings;

CREATE POLICY "Clients and creators can create ratings"
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
  ))
  OR
  -- Le chauffeur peut noter le client
  (driver_id IN (SELECT drivers.id FROM drivers WHERE drivers.user_id = auth.uid()))
);