-- Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;

-- Create a new admin policy that uses a simpler check
-- First check user_roles table directly without going through has_role function
CREATE POLICY "Admins can manage all companies"
ON public.companies
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Also fix the "Drivers can view visible companies" policy which uses EXISTS with drivers table
DROP POLICY IF EXISTS "Drivers can view visible companies" ON public.companies;

-- Recreate with simpler check
CREATE POLICY "Drivers can view visible companies"
ON public.companies
FOR SELECT
USING (
  visible_to_drivers = true 
  AND status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'driver'
  )
);