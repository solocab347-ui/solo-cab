-- Correction du trigger handle_new_user qui utilise 'role' au lieu de 'roles'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role TEXT;
  roles_array TEXT[];
BEGIN
  -- Récupérer le rôle depuis les métadonnées
  user_role := COALESCE(new.raw_user_meta_data ->> 'role', 'client');
  roles_array := ARRAY[user_role];
  
  INSERT INTO public.profiles (id, email, full_name, phone, address, roles, preferred_language)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'address',
    roles_array,
    COALESCE(new.raw_user_meta_data ->> 'preferred_language', 'fr')
  );
  RETURN new;
END;
$function$;