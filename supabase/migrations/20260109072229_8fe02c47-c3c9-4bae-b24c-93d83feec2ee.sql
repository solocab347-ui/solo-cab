-- Ajout politique RLS pour permettre aux chauffeurs de voir les courses via fleet_partner_courses
-- SÉCURITÉ: Les chauffeurs ne voient les courses du gestionnaire QUE si elles leur sont partagées

-- Policy: Drivers can view courses shared to them by fleet managers
CREATE POLICY "Drivers can view fleet shared courses"
ON public.courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM fleet_partner_courses fpc
    WHERE fpc.course_id = courses.id
    AND fpc.driver_id = get_driver_id(auth.uid())
    AND fpc.status NOT IN ('cancelled', 'declined')
  )
);

-- Policy: Fleet managers can view courses they shared
CREATE POLICY "Fleet managers can view their created courses"
ON public.courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM fleet_managers fm
    WHERE fm.id = courses.fleet_manager_id
    AND fm.user_id = auth.uid()
  )
);

-- Policy: Fleet managers can update courses they created
CREATE POLICY "Fleet managers can update their created courses"
ON public.courses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM fleet_managers fm
    WHERE fm.id = courses.fleet_manager_id
    AND fm.user_id = auth.uid()
  )
);

-- Policy: Fleet managers can insert courses for their fleet
CREATE POLICY "Fleet managers can create courses"
ON public.courses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM fleet_managers fm
    WHERE fm.id = fleet_manager_id
    AND fm.user_id = auth.uid()
  )
);