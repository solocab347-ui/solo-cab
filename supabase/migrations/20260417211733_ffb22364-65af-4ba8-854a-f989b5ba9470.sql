
-- ============================================================
-- 1. Guest chat: SECURITY DEFINER RPCs for token-validated send/read
-- ============================================================

CREATE OR REPLACE FUNCTION public.send_guest_ride_message(
  _token text,
  _message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_uuid uuid;
  _ride_id uuid;
  _course_status text;
  _new_msg_id uuid;
  _trimmed text;
BEGIN
  _trimmed := btrim(coalesce(_message, ''));
  IF _trimmed = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_message');
  END IF;

  IF length(_trimmed) > 2000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'message_too_long');
  END IF;

  BEGIN
    _token_uuid := _token::uuid;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END;

  SELECT rr.id, rr.status::text
    INTO _ride_id, _course_status
  FROM ride_requests rr
  JOIN courses c ON rr.final_course_id = c.id
  WHERE c.guest_tracking_token = _token_uuid
    AND c.is_guest_booking = true
  LIMIT 1;

  IF _ride_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ride_not_found');
  END IF;

  IF _course_status NOT IN ('pending','accepted','driver_approaching','driver_arrived','in_progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'chat_closed');
  END IF;

  INSERT INTO ride_messages (ride_id, sender_type, sender_id, message, is_read)
  VALUES (_ride_id, 'guest', 'guest_' || _token_uuid::text, _trimmed, false)
  RETURNING id INTO _new_msg_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', _new_msg_id,
    'ride_id', _ride_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_guest_ride_message(text, text) TO anon, authenticated;

-- Mark messages addressed to the guest as read
CREATE OR REPLACE FUNCTION public.mark_guest_ride_messages_read(
  _token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_uuid uuid;
  _ride_id uuid;
  _updated_count int;
BEGIN
  BEGIN
    _token_uuid := _token::uuid;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END;

  SELECT rr.id INTO _ride_id
  FROM ride_requests rr
  JOIN courses c ON rr.final_course_id = c.id
  WHERE c.guest_tracking_token = _token_uuid
    AND c.is_guest_booking = true
  LIMIT 1;

  IF _ride_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ride_not_found');
  END IF;

  WITH upd AS (
    UPDATE ride_messages
    SET is_read = true
    WHERE ride_id = _ride_id
      AND sender_type <> 'guest'
      AND is_read = false
    RETURNING 1
  )
  SELECT count(*) INTO _updated_count FROM upd;

  RETURN jsonb_build_object('success', true, 'updated', _updated_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_guest_ride_messages_read(text) TO anon, authenticated;

-- Read messages for a guest
CREATE OR REPLACE FUNCTION public.get_guest_ride_messages(
  _token text
)
RETURNS TABLE (
  id uuid,
  ride_id uuid,
  sender_type text,
  sender_id text,
  message text,
  is_read boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_uuid uuid;
  _ride_id uuid;
BEGIN
  BEGIN
    _token_uuid := _token::uuid;
  EXCEPTION WHEN others THEN
    RETURN;
  END;

  SELECT rr.id INTO _ride_id
  FROM ride_requests rr
  JOIN courses c ON rr.final_course_id = c.id
  WHERE c.guest_tracking_token = _token_uuid
    AND c.is_guest_booking = true
  LIMIT 1;

  IF _ride_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT m.id, m.ride_id, m.sender_type::text, m.sender_id::text, m.message, m.is_read, m.created_at
  FROM ride_messages m
  WHERE m.ride_id = _ride_id
  ORDER BY m.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_ride_messages(text) TO anon, authenticated;

-- ============================================================
-- 2. Guest → Client conversion: claim a guest course by token
-- ============================================================

CREATE OR REPLACE FUNCTION public.claim_guest_course_for_user(
  _token text,
  _user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_uuid uuid;
  _course_id uuid;
  _client_id uuid;
  _guest_email text;
  _guest_phone text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_user');
  END IF;

  BEGIN
    _token_uuid := _token::uuid;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END;

  SELECT id, guest_email, guest_phone
    INTO _course_id, _guest_email, _guest_phone
  FROM courses
  WHERE guest_tracking_token = _token_uuid
    AND is_guest_booking = true
  LIMIT 1;

  IF _course_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'course_not_found');
  END IF;

  -- Find the user's client record
  SELECT id INTO _client_id
  FROM clients
  WHERE user_id = _user_id
  LIMIT 1;

  IF _client_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'client_record_missing');
  END IF;

  -- Attach this course AND any other guest courses with same email/phone to this client
  UPDATE courses
  SET client_id = _client_id,
      created_by_user_id = COALESCE(created_by_user_id, _user_id)
  WHERE (
        id = _course_id
     OR (guest_email IS NOT NULL AND lower(guest_email) = lower(coalesce(_guest_email, '')))
     OR (guest_phone IS NOT NULL AND guest_phone = coalesce(_guest_phone, ''))
  )
  AND client_id IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'course_id', _course_id,
    'client_id', _client_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_guest_course_for_user(text, uuid) TO authenticated;
