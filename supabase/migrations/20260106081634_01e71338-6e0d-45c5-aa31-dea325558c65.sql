-- Add RLS policy for companies to view their courses via company_courses
CREATE POLICY "Companies can view courses linked to them"
ON public.courses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM company_courses cc
    WHERE cc.course_id = courses.id
    AND cc.company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
);

-- Allow companies to update courses they're linked to (for status changes like cancellation)
CREATE POLICY "Companies can update courses linked to them"
ON public.courses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM company_courses cc
    WHERE cc.course_id = courses.id
    AND cc.company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  )
);