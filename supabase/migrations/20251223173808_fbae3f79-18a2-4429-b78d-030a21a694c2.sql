-- Permettre aux chauffeurs de voir les courses entreprise qui leur sont assignées
CREATE POLICY "Drivers can view their assigned company courses"
ON public.company_courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = company_courses.course_id
    AND c.driver_id = get_driver_id(auth.uid())
  )
);