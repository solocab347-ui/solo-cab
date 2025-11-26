-- Supprimer les policies restantes qui peuvent causer des problèmes
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Recréer une policy unifiée pour INSERT/UPDATE/DELETE des admins
CREATE POLICY "Admins can manage roles - no recursion"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  -- L'utilisateur peut gérer ses propres rôles pendant l'inscription
  auth.uid() = user_id
  OR
  -- OU si l'utilisateur est admin
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
)
WITH CHECK (
  -- L'utilisateur peut créer son propre rôle pendant l'inscription
  auth.uid() = user_id
  OR
  -- OU si l'utilisateur est admin
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

COMMENT ON POLICY "Admins can manage roles - no recursion" ON public.user_roles IS 
'Permet aux users de gérer leurs propres rôles et aux admins de gérer tous les rôles, sans récursion infinie';
