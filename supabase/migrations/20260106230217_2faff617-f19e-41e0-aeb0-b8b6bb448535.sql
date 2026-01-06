-- Allow employees to update their own company course records (for payment confirmation)
CREATE POLICY "Employees can update their company courses"
ON public.company_courses
FOR UPDATE
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM company_employees WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  employee_id IN (
    SELECT id FROM company_employees WHERE user_id = auth.uid()
  )
);