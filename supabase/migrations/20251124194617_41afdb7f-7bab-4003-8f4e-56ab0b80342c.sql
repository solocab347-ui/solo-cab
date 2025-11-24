-- Ajouter une policy RLS permettant de voir les profils des chauffeurs publics
-- Cela permet aux visiteurs et clients libres de voir les informations des chauffeurs
-- dont le profil public est activé

CREATE POLICY "Public can view public driver profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT user_id 
    FROM public.drivers 
    WHERE public_profile_enabled = true 
      AND status = 'validated'
  )
);