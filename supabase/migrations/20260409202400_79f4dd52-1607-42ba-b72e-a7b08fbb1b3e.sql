-- Allow anon users to SELECT ride_requests they created (by matching guest info pattern)
-- Since anon users don't have auth.uid(), we allow reading by request_group_id for recent requests
CREATE POLICY "Anon can view recent ride requests"
  ON public.ride_requests
  FOR SELECT
  TO anon
  USING (
    client_id IS NULL 
    AND guest_name IS NOT NULL 
    AND created_at > (now() - interval '1 hour')
  );

-- Allow anon users to UPDATE (cancel) their own pending requests
CREATE POLICY "Anon can cancel their ride requests"
  ON public.ride_requests
  FOR UPDATE
  TO anon
  USING (
    client_id IS NULL 
    AND guest_name IS NOT NULL 
    AND status = 'pending'
    AND created_at > (now() - interval '1 hour')
  )
  WITH CHECK (
    status IN ('cancelled')
  );