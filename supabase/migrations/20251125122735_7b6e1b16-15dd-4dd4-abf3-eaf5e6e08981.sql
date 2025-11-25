-- Permettre l'insertion dans user_roles lors de l'inscription
-- Un utilisateur peut créer son propre rôle initial
CREATE POLICY "Users can create their initial role during signup"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Permettre l'insertion dans drivers lors de l'inscription
-- Un utilisateur peut créer son propre profil driver
CREATE POLICY "Users can create their own driver profile"
ON public.drivers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);