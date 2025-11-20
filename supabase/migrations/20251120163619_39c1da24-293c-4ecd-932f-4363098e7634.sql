-- Create app_role enum if not exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'driver', 'client');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table for role-based access control
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (bypasses RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update existing RLS policies to use has_role for admin checks
-- Update profiles table policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update drivers policies
DROP POLICY IF EXISTS "Admins can manage all drivers" ON public.drivers;

CREATE POLICY "Admins can manage all drivers"
  ON public.drivers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update clients policies
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;

CREATE POLICY "Admins can manage all clients"
  ON public.clients FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update courses policies
DROP POLICY IF EXISTS "Admins can manage all courses" ON public.courses;

CREATE POLICY "Admins can manage all courses"
  ON public.courses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update devis policies
DROP POLICY IF EXISTS "Admins can manage all devis" ON public.devis;

CREATE POLICY "Admins can manage all devis"
  ON public.devis FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update factures policies
DROP POLICY IF EXISTS "Admins can manage all factures" ON public.factures;

CREATE POLICY "Admins can manage all factures"
  ON public.factures FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = _user_id 
  LIMIT 1
$$;

-- Function to get platform statistics (admin only)
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats JSON;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'total_drivers', (SELECT COUNT(*) FROM public.drivers),
    'validated_drivers', (SELECT COUNT(*) FROM public.drivers WHERE status = 'validated'),
    'pending_drivers', (SELECT COUNT(*) FROM public.drivers WHERE status = 'pending'),
    'total_clients', (SELECT COUNT(*) FROM public.clients),
    'exclusive_clients', (SELECT COUNT(*) FROM public.clients WHERE is_exclusive = true),
    'free_clients', (SELECT COUNT(*) FROM public.clients WHERE is_exclusive = false),
    'total_courses', (SELECT COUNT(*) FROM public.courses),
    'completed_courses', (SELECT COUNT(*) FROM public.courses WHERE status = 'completed'),
    'pending_courses', (SELECT COUNT(*) FROM public.courses WHERE status = 'pending'),
    'total_devis', (SELECT COUNT(*) FROM public.devis),
    'accepted_devis', (SELECT COUNT(*) FROM public.devis WHERE status = 'accepted'),
    'total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM public.factures WHERE payment_status = 'paid'),
    'public_drivers', (SELECT COUNT(*) FROM public.drivers WHERE public_profile_enabled = true)
  ) INTO stats;

  RETURN stats;
END;
$$;