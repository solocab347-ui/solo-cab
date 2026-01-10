-- Mettre à jour les profils existants avec les téléphones depuis auth.users
UPDATE public.profiles p
SET phone = (u.raw_user_meta_data ->> 'phone')
FROM auth.users u
WHERE p.id = u.id
AND p.phone IS NULL
AND u.raw_user_meta_data ->> 'phone' IS NOT NULL
AND u.raw_user_meta_data ->> 'phone' != '';

-- Mettre à jour aussi les adresses
UPDATE public.profiles p
SET address = (u.raw_user_meta_data ->> 'address')
FROM auth.users u
WHERE p.id = u.id
AND p.address IS NULL
AND u.raw_user_meta_data ->> 'address' IS NOT NULL
AND u.raw_user_meta_data ->> 'address' != '';

-- Recréer le trigger handle_new_user pour inclure phone et address
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, address, role, preferred_language)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'address',
    COALESCE(new.raw_user_meta_data ->> 'role', 'client'),
    COALESCE(new.raw_user_meta_data ->> 'preferred_language', 'fr')
  );
  RETURN new;
END;
$$;