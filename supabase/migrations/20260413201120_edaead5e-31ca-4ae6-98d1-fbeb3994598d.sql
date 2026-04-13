
CREATE OR REPLACE FUNCTION public.create_driver_profile(
  p_user_id UUID,
  p_status TEXT DEFAULT 'on_hold',
  p_license_number TEXT DEFAULT '',
  p_vehicle_brand TEXT DEFAULT '',
  p_vehicle_model TEXT DEFAULT '',
  p_vehicle_year INT DEFAULT NULL,
  p_vehicle_color TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Verify user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_user_exists;
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;

  -- Check if driver profile already exists
  SELECT id INTO v_driver_id FROM public.drivers WHERE user_id = p_user_id;
  IF v_driver_id IS NOT NULL THEN
    RETURN v_driver_id;
  END IF;

  INSERT INTO public.drivers (
    user_id, status, subscription_status, subscription_paid,
    trial_status, documents_status, registration_step,
    license_number, vehicle_brand, vehicle_model, vehicle_year, vehicle_color
  ) VALUES (
    p_user_id, p_status::driver_status, 'inactive', false,
    'pending', 'pending', 1,
    p_license_number, p_vehicle_brand, p_vehicle_model, 
    COALESCE(p_vehicle_year, EXTRACT(YEAR FROM NOW())::INT), p_vehicle_color
  )
  RETURNING id INTO v_driver_id;

  RETURN v_driver_id;
END;
$$;
