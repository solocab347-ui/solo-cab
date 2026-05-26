DROP POLICY IF EXISTS "Guests can read their ride messages" ON public.ride_messages;
DROP POLICY IF EXISTS "Guests can send ride messages" ON public.ride_messages;
DROP POLICY IF EXISTS "Guests can update read status" ON public.ride_messages;
REVOKE SELECT, INSERT, UPDATE ON public.ride_messages FROM anon;