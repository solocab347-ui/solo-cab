-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Drivers can view requests for their quotes" ON public.company_course_requests;

-- Create a security definer function to get request IDs for driver's quotes without triggering RLS
CREATE OR REPLACE FUNCTION public.get_driver_quote_request_ids(_driver_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT request_id
  FROM company_course_quotes
  WHERE driver_id = _driver_id;
$$;

-- Create a helper function to get the current user's driver ID
CREATE OR REPLACE FUNCTION public.get_current_driver_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM drivers WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Create new policy using the security definer function
CREATE POLICY "Drivers can view requests for their quotes" 
ON public.company_course_requests 
FOR SELECT 
USING (
  id IN (SELECT public.get_driver_quote_request_ids(public.get_current_driver_id()))
);