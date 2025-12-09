
-- ===========================================
-- 1. TABLE ENTREPRISES (Companies)
-- ===========================================
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  siret TEXT NOT NULL,
  siren TEXT,
  address TEXT NOT NULL,
  billing_address TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  department TEXT,
  employee_count INTEGER,
  monthly_budget NUMERIC,
  preferred_vehicle_types TEXT[],
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies
CREATE POLICY "Companies can view their own profile"
ON public.companies FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Companies can update their own profile"
ON public.companies FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own company profile"
ON public.companies FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all companies"
ON public.companies FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers can view validated companies"
ON public.companies FOR SELECT
USING (status = 'validated');

-- Index for performance
CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_companies_status ON public.companies(status);

-- ===========================================
-- 2. TABLE COMPANY-DRIVER ASSOCIATIONS
-- ===========================================
CREATE TABLE public.company_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, driver_id)
);

ALTER TABLE public.company_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Companies can view their drivers"
ON public.company_drivers FOR SELECT
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Companies can manage their driver associations"
ON public.company_drivers FOR ALL
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can view their company associations"
ON public.company_drivers FOR SELECT
USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Admins can manage all company drivers"
ON public.company_drivers FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_company_drivers_company ON public.company_drivers(company_id);
CREATE INDEX idx_company_drivers_driver ON public.company_drivers(driver_id);

-- ===========================================
-- 3. ADD 'company' ROLE TO ENUM
-- ===========================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company';

-- ===========================================
-- 4. TRIGGER: Auto-update client stats on course completion
-- ===========================================
CREATE OR REPLACE FUNCTION public.update_client_stats_on_course_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si la course vient d'être complétée
  IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
    -- Mettre à jour total_rides du client
    UPDATE clients
    SET total_rides = (
      SELECT COUNT(*) FROM courses 
      WHERE client_id = NEW.client_id AND status = 'completed'
    )
    WHERE id = NEW.client_id;
    
    -- Mettre à jour total_spent du client (basé sur factures payées)
    UPDATE clients
    SET total_spent = (
      SELECT COALESCE(SUM(amount), 0) FROM factures 
      WHERE client_id = NEW.client_id AND payment_status = 'paid'
    )
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_client_stats ON courses;
CREATE TRIGGER trigger_update_client_stats
AFTER UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_client_stats_on_course_completion();

-- ===========================================
-- 5. TRIGGER: Auto-update client total_spent on invoice payment
-- ===========================================
CREATE OR REPLACE FUNCTION public.update_client_spent_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si la facture vient d'être payée
  IF (TG_OP = 'UPDATE' AND NEW.payment_status = 'paid' AND OLD.payment_status != 'paid') OR
     (TG_OP = 'INSERT' AND NEW.payment_status = 'paid') THEN
    UPDATE clients
    SET total_spent = (
      SELECT COALESCE(SUM(amount), 0) FROM factures 
      WHERE client_id = NEW.client_id AND payment_status = 'paid'
    )
    WHERE id = NEW.client_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_client_spent ON factures;
CREATE TRIGGER trigger_update_client_spent
AFTER INSERT OR UPDATE ON public.factures
FOR EACH ROW
EXECUTE FUNCTION public.update_client_spent_on_payment();

-- ===========================================
-- 6. FUNCTION: Get company ID from user
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.companies WHERE user_id = _user_id
$$;
