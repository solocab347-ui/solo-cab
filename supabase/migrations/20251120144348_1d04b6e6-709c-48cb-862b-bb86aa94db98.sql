-- PARTIE 1: RECONSTRUCTION SYSTÈME D'AUTHENTIFICATION (CORRECT ORDER)

-- 1. Supprimer TOUTES les policies qui dépendent de has_role
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all drivers" ON public.drivers;
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage all devis" ON public.devis;
DROP POLICY IF EXISTS "Admins can manage all factures" ON public.factures;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- 2. Maintenant on peut supprimer la fonction et la table
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TYPE IF EXISTS public.app_role;

-- 3. Ajouter les colonnes roles[] et profile_photo_url à profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- 4. Créer la nouvelle fonction has_role qui utilise l'array
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _role = ANY(
    SELECT unnest(roles) FROM public.profiles WHERE id = _user_id
  )
$$;

-- 5. Recréer TOUTES les policies admin avec la nouvelle fonction
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all drivers"
  ON public.drivers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all clients"
  ON public.clients FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all courses"
  ON public.courses FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all devis"
  ON public.devis FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all factures"
  ON public.factures FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Fonctions utilitaires pour gérer les rôles
CREATE OR REPLACE FUNCTION public.add_user_role(_user_id UUID, _role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET roles = array_append(roles, _role)
  WHERE id = _user_id AND NOT (_role = ANY(roles));
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_user_role(_user_id UUID, _role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET roles = array_remove(roles, _role)
  WHERE id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TEXT[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT roles FROM public.profiles WHERE id = _user_id
$$;