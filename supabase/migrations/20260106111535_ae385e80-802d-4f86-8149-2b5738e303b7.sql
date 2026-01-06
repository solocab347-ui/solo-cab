-- Allow public read access to courses that are linked to valid tracking invitations
CREATE POLICY "Guest employees can read courses via invitation token"
ON public.courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_employee_course_invitations ceci
    WHERE ceci.course_id = courses.id
  )
);