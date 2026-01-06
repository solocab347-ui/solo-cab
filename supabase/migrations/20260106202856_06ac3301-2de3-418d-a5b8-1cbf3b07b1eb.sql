-- Update RLS policy for company_courses to allow employees to see their courses
DROP POLICY IF EXISTS "Employees can view their company courses" ON company_courses;

CREATE POLICY "Employees can view their company courses" ON company_courses
FOR SELECT TO authenticated
USING (
  -- Company owner can see all
  company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
  -- Company admin can see all
  OR company_id IN (SELECT company_id FROM company_administrators WHERE user_id = auth.uid() AND is_active = true)
  -- Employee can see courses assigned to them
  OR employee_id IN (SELECT id FROM company_employees WHERE user_id = auth.uid())
  -- Employee can see courses they created (via created_by_user_id in courses table)
  OR EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = company_courses.course_id
    AND c.created_by_user_id = auth.uid()
  )
  -- Employee can see all courses from their company (if they are an employee of that company)
  OR company_id IN (SELECT company_id FROM company_employees WHERE user_id = auth.uid() AND is_active = true)
);