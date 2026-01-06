-- Permettre aux chauffeurs de lire les infos des employés pour leurs courses entreprise
CREATE POLICY "Drivers can view employees for their company courses"
ON public.company_employees
FOR SELECT
USING (
  id IN (
    SELECT cc.employee_id 
    FROM company_courses cc
    JOIN courses c ON c.id = cc.course_id
    JOIN drivers d ON d.user_id = auth.uid()
    WHERE cc.employee_id IS NOT NULL
    AND (c.driver_id = d.id OR d.id = ANY(c.driver_ids))
  )
);