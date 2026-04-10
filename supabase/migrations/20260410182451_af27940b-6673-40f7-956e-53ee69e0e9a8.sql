
CREATE POLICY "Guests can view their course via tracking token"
ON public.courses
FOR SELECT
TO anon
USING (
  is_guest_booking = true
  AND guest_tracking_token IS NOT NULL
);
