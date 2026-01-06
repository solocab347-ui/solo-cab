-- Allow company owners to view profiles of their employees
CREATE POLICY "Companies can view their employees profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM company_employees ce
    JOIN companies c ON c.id = ce.company_id
    WHERE ce.user_id = profiles.id 
    AND c.user_id = auth.uid()
    AND ce.is_active = true
  )
);

-- Allow company administrators to view profiles of employees in their company
CREATE POLICY "Company admins can view employees profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM company_employees ce
    JOIN company_administrators ca ON ca.company_id = ce.company_id
    WHERE ce.user_id = profiles.id 
    AND ca.user_id = auth.uid()
    AND ca.is_active = true
    AND ce.is_active = true
  )
);