-- Allow drivers to view course requests for which they have a quote
CREATE POLICY "Drivers can view requests for their quotes" 
ON public.company_course_requests 
FOR SELECT 
USING (
  id IN (
    SELECT request_id 
    FROM company_course_quotes 
    WHERE driver_id IN (
      SELECT id FROM drivers WHERE user_id = auth.uid()
    )
  )
);