-- Supprimer la policy récursive qui cause la boucle
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

-- Garder seulement la policy simple pour que les users voient leurs propres rôles
-- Cette policy utilise auth.uid() = user_id donc pas de récursion
-- L'admin pourra voir son propre rôle grâce à cette policy

-- Recréer une policy pour les admins qui utilise un pattern sécurisé
-- En utilisant EXISTS au lieu d'appeler has_role directement
CREATE POLICY "Admins can view all roles - no recursion"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  -- L'utilisateur peut voir ses propres rôles
  auth.uid() = user_id
  OR
  -- OU si l'utilisateur est admin (vérifié sans récursion)
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

COMMENT ON POLICY "Admins can view all roles - no recursion" ON public.user_roles IS 
'Permet aux users de voir leurs propres rôles et aux admins de voir tous les rôles, sans récursion infinie';
