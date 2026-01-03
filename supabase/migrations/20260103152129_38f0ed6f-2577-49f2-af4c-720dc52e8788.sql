-- Allow receivers to view courses that have been shared with them
CREATE POLICY "Receivers can view shared courses" 
ON public.courses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.shared_courses sc
    WHERE sc.course_id = courses.id
      AND sc.receiver_driver_id = get_driver_id(auth.uid())
      AND sc.cancelled_at IS NULL
      AND sc.status IN ('pending', 'accepted', 'in_progress', 'completed')
  )
);