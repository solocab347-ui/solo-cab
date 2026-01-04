-- Créer une nouvelle politique pour les chauffeurs créant des courses pour clients non inscrits
-- Drop la politique existante qui est trop restrictive
DROP POLICY IF EXISTS "Allow guest bookings creation" ON public.courses;

-- Nouvelle politique: Les chauffeurs peuvent créer des courses pour des clients non inscrits
CREATE POLICY "Drivers can create guest courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (
  -- Le chauffeur doit être le propriétaire de la course
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
  -- Et c'est une course pour client non inscrit (guest)
  AND is_guest_booking = true
  AND guest_name IS NOT NULL
  AND guest_phone IS NOT NULL
);

-- Recréer la politique pour les réservations anonymes (clients non connectés)
CREATE POLICY "Allow anonymous guest bookings"
ON public.courses
FOR INSERT
TO anon
WITH CHECK (
  is_guest_booking = true
  AND guest_name IS NOT NULL  
  AND guest_phone IS NOT NULL
  AND driver_id IS NOT NULL
);