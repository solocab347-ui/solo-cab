-- Allow drivers to create courses for their clients
CREATE POLICY "Drivers can create courses for their clients"
ON public.courses
FOR INSERT
WITH CHECK (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  )
  AND
  client_id IN (
    SELECT c.id 
    FROM clients c
    JOIN drivers d ON (c.driver_id = d.id OR d.id = ANY(c.driver_ids))
    WHERE d.user_id = auth.uid()
  )
);