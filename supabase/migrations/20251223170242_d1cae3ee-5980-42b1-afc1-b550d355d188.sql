
-- Corriger la fonction avec search_path
CREATE OR REPLACE FUNCTION public.update_company_driver_agreement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
