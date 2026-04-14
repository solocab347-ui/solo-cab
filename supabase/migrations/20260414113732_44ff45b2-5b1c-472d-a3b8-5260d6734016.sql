
-- Fix existing validated drivers that don't have public_profile_enabled
UPDATE public.drivers SET public_profile_enabled = true WHERE status = 'validated' AND public_profile_enabled = false;

-- Create trigger to auto-enable public profile on validation
CREATE OR REPLACE FUNCTION public.auto_enable_public_profile_on_validation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'validated' AND (OLD.status IS DISTINCT FROM 'validated') THEN
    NEW.public_profile_enabled := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auto_enable_public_profile ON public.drivers;
CREATE TRIGGER trigger_auto_enable_public_profile
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_enable_public_profile_on_validation();
