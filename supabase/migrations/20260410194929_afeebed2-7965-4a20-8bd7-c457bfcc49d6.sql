
-- RPC pour que les guests trouvent leur ride_request_id via leur token
CREATE OR REPLACE FUNCTION public.get_ride_request_id_for_guest(_token text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_uuid uuid;
  _result uuid;
BEGIN
  BEGIN
    _token_uuid := _token::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  SELECT rr.id INTO _result
  FROM ride_requests rr
  JOIN courses c ON rr.final_course_id = c.id
  WHERE c.guest_tracking_token = _token_uuid
    AND c.is_guest_booking = true
  LIMIT 1;

  RETURN _result;
END;
$$;

-- Drop old guest policies
DROP POLICY IF EXISTS "Guests can read their ride messages" ON public.ride_messages;
DROP POLICY IF EXISTS "Guests can send ride messages" ON public.ride_messages;

-- Nouvelle policy READ pour guests : lecture uniquement des messages de LEUR course
CREATE POLICY "Guests can read their ride messages"
ON public.ride_messages FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM ride_requests rr
    JOIN courses c ON rr.final_course_id = c.id
    WHERE rr.id = ride_messages.ride_id
      AND c.is_guest_booking = true
      AND c.guest_tracking_token IS NOT NULL
      AND rr.status IN ('pending', 'accepted', 'in_progress', 'driver_arrived', 'driver_approaching', 'completed')
  )
);

-- Nouvelle policy INSERT pour guests : vérification que le ride_id est une course active
CREATE POLICY "Guests can send ride messages"
ON public.ride_messages FOR INSERT
TO anon
WITH CHECK (
  sender_type = 'guest'
  AND EXISTS (
    SELECT 1 FROM ride_requests rr
    JOIN courses c ON rr.final_course_id = c.id
    WHERE rr.id = ride_messages.ride_id
      AND c.is_guest_booking = true
      AND rr.status IN ('pending', 'accepted', 'in_progress', 'driver_arrived', 'driver_approaching')
  )
);

-- Aussi permettre aux guests de mettre à jour is_read sur leurs messages
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
  )
)
WITH CHECK (
  sender_type != 'guest'
);
