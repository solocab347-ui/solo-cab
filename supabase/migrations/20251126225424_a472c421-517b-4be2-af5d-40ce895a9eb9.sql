-- Supprimer toutes les policies existantes
DROP POLICY IF EXISTS "Admins can view all roles - no recursion" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles - no recursion" ON public.user_roles;
DROP POLICY IF EXISTS "Users can create their initial role during signup" ON public.user_roles;

-- Créer une policy SIMPLE pour SELECT : tout le monde peut voir ses propres rôles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy pour INSERT : tout le monde peut créer son propre rôle
CREATE POLICY "Users can create own roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy pour UPDATE/DELETE : seulement via SERVICE_ROLE
-- (les admins utiliseront le SERVICE_ROLE_KEY pour gérer les rôles)

COMMENT ON POLICY "Users can view own roles" ON public.user_roles IS 
'Chaque utilisateur peut voir uniquement ses propres rôles. Les admins utilisent SERVICE_ROLE_KEY pour voir tous les rôles.';

COMMENT ON POLICY "Users can create own roles" ON public.user_roles IS 
'Chaque utilisateur peut créer ses propres rôles pendant l''inscription. Les admins utilisent SERVICE_ROLE_KEY pour créer des rôles pour d''autres users.';
