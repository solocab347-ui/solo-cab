
-- Drop the overly permissive policy that allows unauthenticated access
DROP POLICY IF EXISTS "Drivers can view validated companies" ON public.companies;

-- Recreate with proper authentication and role check
CREATE POLICY "Drivers can view validated companies"
ON public.companies
FOR SELECT
TO authenticated
USING (
  status = 'validated'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'driver'
  )
);
