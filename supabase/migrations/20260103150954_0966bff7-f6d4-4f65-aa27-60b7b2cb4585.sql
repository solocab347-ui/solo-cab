-- Allow partners to view pooled courses (corrected - using partnership_ids array)
CREATE POLICY "Partners can view pooled courses" 
ON public.courses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.partner_course_pool pcp
    WHERE pcp.course_id = courses.id
      AND pcp.status = 'available'
      AND pcp.expires_at > now()
      AND EXISTS (
        SELECT 1 FROM public.driver_partnerships dp
        WHERE dp.id = ANY(pcp.partnership_ids)
          AND (dp.driver_a_id = get_driver_id(auth.uid()) OR dp.driver_b_id = get_driver_id(auth.uid()))
          AND dp.status = 'active'
      )
  )
);