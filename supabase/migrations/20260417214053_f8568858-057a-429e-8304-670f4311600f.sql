
-- ============================================================
-- 1. REPAIR STUCK ACCOUNT: kanouteabdallah666@gmail.com
-- ============================================================

UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    phone_confirmed_at = COALESCE(phone_confirmed_at, now())
WHERE id = '9ad0d25b-fc55-45a9-92c2-2c314f1869fa';

INSERT INTO public.profiles (id, full_name, email, phone)
VALUES (
  '9ad0d25b-fc55-45a9-92c2-2c314f1869fa',
  'Abdallah Kanoute',
  'kanouteabdallah666@gmail.com',
  '0751597391'
)
ON CONFLICT (id) DO UPDATE SET
  email = COALESCE(EXCLUDED.email, public.profiles.email),
  phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
  full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

INSERT INTO public.user_roles (user_id, role)
VALUES ('9ad0d25b-fc55-45a9-92c2-2c314f1869fa', 'client')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.clients (user_id, is_exclusive, driver_ids)
VALUES ('9ad0d25b-fc55-45a9-92c2-2c314f1869fa', false, '{}')
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.courses c
SET client_id = (SELECT id FROM public.clients WHERE user_id = '9ad0d25b-fc55-45a9-92c2-2c314f1869fa'),
    created_by_user_id = COALESCE(c.created_by_user_id, '9ad0d25b-fc55-45a9-92c2-2c314f1869fa')
WHERE c.client_id IS NULL
  AND (
    lower(c.guest_email) = 'kanouteabdallah666@gmail.com'
    OR c.guest_phone = '0751597391'
  );

-- ============================================================
-- 2. AUTO-CLAIM GUEST COURSES BY CONTACT (email/phone)
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_claim_guest_courses_on_client_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _phone text;
BEGIN
  SELECT lower(au.email), COALESCE(au.phone, p.phone)
    INTO _email, _phone
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE au.id = NEW.user_id;

  IF _email IS NULL AND _phone IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.courses
  SET client_id = NEW.id,
      created_by_user_id = COALESCE(created_by_user_id, NEW.user_id)
  WHERE client_id IS NULL
    AND is_guest_booking = true
    AND (
      (_email IS NOT NULL AND lower(guest_email) = _email)
      OR (_phone IS NOT NULL AND guest_phone = _phone)
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_claim_guest_courses ON public.clients;
CREATE TRIGGER trg_auto_claim_guest_courses
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.auto_claim_guest_courses_on_client_create();
