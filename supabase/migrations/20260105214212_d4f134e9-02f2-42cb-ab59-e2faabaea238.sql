-- Drop the old policy
DROP POLICY IF EXISTS "Allow read via invitation token" ON public.company_course_requests;

-- Create a more permissive policy for public access to request data via invitation
-- Since company_employee_course_invitations has "Anyone can view" policy, 
-- we allow public SELECT on requests that have an invitation
CREATE POLICY "Public read access via invitation" 
ON public.company_course_requests 
FOR SELECT 
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM company_employee_course_invitations 
    WHERE company_employee_course_invitations.request_id = company_course_requests.id
  )
);

-- Same for company_course_quotes
DROP POLICY IF EXISTS "Allow read via invitation token" ON public.company_course_quotes;

CREATE POLICY "Public read access via invitation" 
ON public.company_course_quotes 
FOR SELECT 
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM company_employee_course_invitations 
    WHERE company_employee_course_invitations.request_id = company_course_quotes.request_id
  )
);