
-- Auto-assign driver role when a driver record is created
CREATE OR REPLACE FUNCTION public.auto_assign_driver_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'driver')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_driver_role
  AFTER INSERT ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_driver_role();
