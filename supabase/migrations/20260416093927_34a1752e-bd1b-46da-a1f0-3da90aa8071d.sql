
-- Helper function to get client's user_id, email, and phone
CREATE OR REPLACE FUNCTION public.client_can_view_course(course_row courses)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clients c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.user_id = auth.uid()
      AND (
        course_row.client_id = c.id
        OR course_row.created_by_user_id = c.user_id
        OR (course_row.guest_email IS NOT NULL AND lower(course_row.guest_email) = lower(p.email))
        OR (course_row.guest_phone IS NOT NULL AND course_row.guest_phone = p.phone)
      )
  );
$$;

-- Drop old policy
DROP POLICY IF EXISTS "Clients can manage their own courses" ON public.courses;

-- Recreate with broader matching
CREATE POLICY "Clients can manage their own courses"
  ON public.courses
  FOR ALL
  USING (public.client_can_view_course(courses.*))
  WITH CHECK (public.client_can_view_course(courses.*));
