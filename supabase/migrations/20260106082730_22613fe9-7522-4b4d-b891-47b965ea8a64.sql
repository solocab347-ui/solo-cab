-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Companies can view courses linked to them" ON public.courses;
DROP POLICY IF EXISTS "Companies can update courses linked to them" ON public.courses;

-- Create a SECURITY DEFINER function to check if a course belongs to a company
CREATE OR REPLACE FUNCTION public.is_company_course(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_courses cc
    JOIN companies comp ON cc.company_id = comp.id
    WHERE cc.course_id = _course_id
    AND comp.user_id = _user_id
  )
$$;

-- Create safe RLS policies for courses using the SECURITY DEFINER function
CREATE POLICY "Companies can view courses linked to them"
ON public.courses
FOR SELECT
USING (public.is_company_course(id, auth.uid()));

CREATE POLICY "Companies can update courses linked to them"
ON public.courses
FOR UPDATE
USING (public.is_company_course(id, auth.uid()));

-- Also update the driver policy on company_courses to use a function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_driver_assigned_to_course(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = _course_id
    AND c.driver_id = get_driver_id(_user_id)
  )
$$;

-- Drop the old recursive policy
DROP POLICY IF EXISTS "Drivers can view their assigned company courses" ON public.company_courses;

-- Create new safe policy
CREATE POLICY "Drivers can view their assigned company courses"
ON public.company_courses
FOR SELECT
USING (public.is_driver_assigned_to_course(course_id, auth.uid()));