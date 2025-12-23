
-- Table des invitations employés
CREATE TABLE public.company_employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  email text,
  employee_name text,
  department text,
  can_create_courses boolean DEFAULT true,
  can_view_invoices boolean DEFAULT true,
  max_monthly_budget numeric,
  is_used boolean DEFAULT false,
  used_at timestamp with time zone,
  used_by_user_id uuid,
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- Table des employés d'entreprise
CREATE TABLE public.company_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invitation_id uuid REFERENCES public.company_employee_invitations(id),
  employee_code text UNIQUE DEFAULT 'EMP-' || upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 8)),
  department text,
  job_title text,
  can_create_courses boolean DEFAULT true,
  can_view_invoices boolean DEFAULT true,
  can_view_all_company_courses boolean DEFAULT false,
  max_monthly_budget numeric,
  current_month_spent numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  joined_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Table des courses d'entreprise (lien entre course et employé/entreprise)
CREATE TABLE public.company_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.company_employees(id) ON DELETE SET NULL,
  created_by_employee boolean DEFAULT true,
  invoice_to_company boolean DEFAULT true,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(course_id)
);

-- Ajouter colonne company_id aux factures pour facturation entreprise
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS company_employee_id uuid REFERENCES public.company_employees(id);

-- Ajouter colonne company_id aux devis
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS company_employee_id uuid REFERENCES public.company_employees(id);

-- Enable RLS
ALTER TABLE public.company_employee_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour company_employee_invitations
CREATE POLICY "Companies can manage their invitations"
ON public.company_employee_invitations FOR ALL
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Public can view valid invitations by token"
ON public.company_employee_invitations FOR SELECT
USING (is_used = false AND expires_at > now());

CREATE POLICY "Admins can manage all invitations"
ON public.company_employee_invitations FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies pour company_employees
CREATE POLICY "Employees can view their own record"
ON public.company_employees FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Employees can update their own non-permission fields"
ON public.company_employees FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Companies can manage their employees"
ON public.company_employees FOR ALL
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all employees"
ON public.company_employees FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies pour company_courses
CREATE POLICY "Employees can view their company courses"
ON public.company_courses FOR SELECT
USING (
  employee_id IN (SELECT id FROM company_employees WHERE user_id = auth.uid())
  OR company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

CREATE POLICY "Employees can create company courses"
ON public.company_courses FOR INSERT
WITH CHECK (
  employee_id IN (SELECT id FROM company_employees WHERE user_id = auth.uid() AND can_create_courses = true)
);

CREATE POLICY "Companies can manage their courses"
ON public.company_courses FOR ALL
USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all company courses"
ON public.company_courses FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Index pour performance
CREATE INDEX idx_company_employees_company_id ON public.company_employees(company_id);
CREATE INDEX idx_company_employees_user_id ON public.company_employees(user_id);
CREATE INDEX idx_company_courses_company_id ON public.company_courses(company_id);
CREATE INDEX idx_company_invitations_token ON public.company_employee_invitations(token);

-- Fonction pour obtenir l'entreprise d'un employé
CREATE OR REPLACE FUNCTION public.get_employee_company_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM company_employees 
  WHERE user_id = p_user_id AND is_active = true 
  LIMIT 1;
$$;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_company_employee_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_employees_timestamp
BEFORE UPDATE ON public.company_employees
FOR EACH ROW EXECUTE FUNCTION public.update_company_employee_timestamp();
