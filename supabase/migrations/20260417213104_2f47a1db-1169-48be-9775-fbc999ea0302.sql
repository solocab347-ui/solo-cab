DO $$
DECLARE
  _user_id uuid := '47d3a83a-9ed3-4965-90fc-4da1bc039b01';
  _course_id uuid := '6a95177e-3fd4-48e3-b548-be9c582aa1dc';
  _phone text := '0751597391';
  _client_id uuid;
BEGIN
  UPDATE auth.users
  SET
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    phone = COALESCE(NULLIF(phone, ''), _phone),
    phone_confirmed_at = COALESCE(phone_confirmed_at, now()),
    updated_at = now()
  WHERE id = _user_id;

  UPDATE public.profiles
  SET phone = COALESCE(NULLIF(phone, ''), _phone)
  WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;

  SELECT id INTO _client_id FROM public.clients WHERE user_id = _user_id LIMIT 1;
  IF _client_id IS NULL THEN
    INSERT INTO public.clients (user_id, is_exclusive, driver_ids)
    VALUES (_user_id, false, ARRAY[]::uuid[])
    RETURNING id INTO _client_id;
  END IF;

  UPDATE public.courses
  SET client_id = _client_id,
      created_by_user_id = COALESCE(created_by_user_id, _user_id)
  WHERE client_id IS NULL
    AND (
      id = _course_id
      OR lower(coalesce(guest_email, '')) = 'samacab538@gmail.com'
      OR coalesce(guest_phone, '') = _phone
    );

  RAISE NOTICE 'Done user_id=% client_id=%', _user_id, _client_id;
END $$;