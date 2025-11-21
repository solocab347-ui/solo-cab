
-- Supprimer le trigger sur profiles
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;

-- Supprimer le trigger sur auth.users si existe
DROP TRIGGER IF EXISTS on_auth_user_role_assigned ON auth.users;

-- Supprimer la fonction avec CASCADE pour supprimer tous les objets dépendants
DROP FUNCTION IF EXISTS public.assign_user_role() CASCADE;

-- Nettoyer les rôles "client" incorrects pour les emails spécifiés
DELETE FROM public.user_roles 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('kanouteabdallah6@gmail.com', 'abdoucoach24@gmail.com')
) AND role = 'client';
