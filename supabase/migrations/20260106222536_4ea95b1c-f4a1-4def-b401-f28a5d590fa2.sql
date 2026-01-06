-- Allow company employees to view factures for their courses
CREATE POLICY "company_employees_can_view_their_factures"
ON public.factures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_courses cc
    JOIN company_employees ce ON cc.employee_id = ce.id
    WHERE cc.course_id = factures.course_id
    AND ce.user_id = auth.uid()
    AND ce.is_active = true
  )
);