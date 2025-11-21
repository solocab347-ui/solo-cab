-- Allow clients to view their drivers' profiles
CREATE POLICY "Clients can view their drivers profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT d.user_id
    FROM drivers d
    JOIN clients c ON (c.driver_id = d.id OR d.id = ANY(c.driver_ids))
    WHERE c.user_id = auth.uid()
  )
);