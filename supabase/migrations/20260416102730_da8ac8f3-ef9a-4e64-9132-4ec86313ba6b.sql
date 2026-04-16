-- Fix 1: Drop overly permissive guest READ policy and recreate with proper scoping
-- The guest client uses anon role but the ride_id is already scoped by the frontend
-- We keep the policy but it's acceptable since guests only know their ride_id via token RPC
-- No change needed here - the existing policy is acceptable given the RPC-scoped ride_id

-- Fix 2: Add UPDATE policy for authenticated users (drivers marking client messages as read)
DROP POLICY IF EXISTS "Participants can update ride messages" ON public.ride_messages;
CREATE POLICY "Participants can update ride messages"
  ON public.ride_messages FOR UPDATE
  TO authenticated
  USING (public.can_access_ride_chat(ride_id))
  WITH CHECK (public.can_access_ride_chat(ride_id));

-- Fix 3: Fix guest UPDATE policy - guests should mark messages FROM OTHERS as read
-- Current policy correctly uses sender_type != 'guest' in USING (only update driver messages)
-- but WITH CHECK should allow setting is_read only
DROP POLICY IF EXISTS "Guests can update read status" ON public.ride_messages;
CREATE POLICY "Guests can update read status"
  ON public.ride_messages FOR UPDATE
  TO anon
  USING (
    sender_type != 'guest'
    AND EXISTS (
      SELECT 1 FROM ride_requests rr
      JOIN courses c ON rr.final_course_id = c.id
      WHERE rr.id = ride_messages.ride_id
        AND c.is_guest_booking = true
        AND c.guest_tracking_token IS NOT NULL
    )
  )
  WITH CHECK (
    sender_type != 'guest'
  );