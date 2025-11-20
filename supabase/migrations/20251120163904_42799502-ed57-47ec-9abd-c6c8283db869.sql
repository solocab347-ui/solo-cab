-- Function to automatically insert user role after signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Extract role from raw_user_meta_data or default to 'client'
  -- This will be called after the profile is created
  RETURN NEW;
END;
$$;

-- Trigger to assign role after profile creation
-- This runs AFTER the profile row is inserted by handle_new_user()
CREATE OR REPLACE FUNCTION public.assign_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Check if user is driver or client based on existing tables
  IF EXISTS (SELECT 1 FROM public.drivers WHERE user_id = NEW.id) THEN
    user_role := 'driver';
  ELSIF EXISTS (SELECT 1 FROM public.clients WHERE user_id = NEW.id) THEN
    user_role := 'client';
  ELSE
    -- Default to client if no specific role found
    user_role := 'client';
  END IF;

  -- Insert role into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;

CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_user_role();