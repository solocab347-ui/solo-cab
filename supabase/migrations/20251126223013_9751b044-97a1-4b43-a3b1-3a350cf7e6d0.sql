-- Fix notifications RLS policy to prevent spam
DROP POLICY IF EXISTS "Users can create notifications for any user" ON public.notifications;

CREATE POLICY "Only admins and system can create notifications"
ON public.notifications 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin')
);

-- Add comment for documentation
COMMENT ON POLICY "Only admins and system can create notifications" ON public.notifications IS 
'Restricts notification creation to admin users only. Edge functions should use SERVICE_ROLE_KEY to create notifications.';
