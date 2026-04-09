
-- Fix courses: Remove overly permissive guest employee invitation policy
DROP POLICY IF EXISTS "Guest employees can read courses via invitation token" ON public.courses;

-- Fix notifications: Restrict INSERT to own user_id or admin
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

CREATE POLICY "Users can create their own notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::text)
);
