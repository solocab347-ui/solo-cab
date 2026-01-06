-- Drop the old policy and function
DROP POLICY IF EXISTS "Company employees can create courses with partner drivers" ON public.courses;
DROP FUNCTION IF EXISTS public.is_company_employee_of_driver(uuid);

-- Recreate function using security invoker pattern instead
CREATE OR REPLACE FUNCTION public.is_company_employee_of_driver(p_driver_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM company_employees ce
    JOIN company_driver_agreements cda ON cda.company_id = ce.company_id
    WHERE ce.user_id = p_user_id
      AND ce.is_active = true
      AND (ce.is_suspended IS NULL OR ce.is_suspended = false)
      AND cda.driver_id = p_driver_id
      AND cda.status = 'accepted'
  )
  OR EXISTS (
    SELECT 1
    FROM company_administrators ca
    JOIN company_driver_agreements cda ON cda.company_id = ca.company_id
    WHERE ca.user_id = p_user_id
      AND ca.is_active = true
      AND cda.driver_id = p_driver_id
      AND cda.status = 'accepted'
  )
$$;

-- Recreate policy passing auth.uid() explicitly
CREATE POLICY "Company employees can create courses with partner drivers"
ON public.courses
FOR INSERT
WITH CHECK (
  public.is_company_employee_of_driver(driver_id, auth.uid())
);