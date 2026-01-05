-- Allow public read access to company_course_requests via invitation token
-- This is needed for guest employee tracking page
CREATE POLICY "Allow read via invitation token" 
ON public.company_course_requests 
FOR SELECT 
USING (
  id IN (
    SELECT request_id 
    FROM company_employee_course_invitations 
    WHERE request_id IS NOT NULL
  )
);

-- Also need to allow read access to company_course_quotes for guest tracking
CREATE POLICY "Allow read via invitation token" 
ON public.company_course_quotes 
FOR SELECT 
USING (
  request_id IN (
    SELECT request_id 
    FROM company_employee_course_invitations 
    WHERE request_id IS NOT NULL
  )
);