-- Ajouter les champs de paiement aux courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS payment_method_requested TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_method_used TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID DEFAULT NULL;

-- Ajouter le champ pour savoir qui paie (entreprise ou collaborateur)
ALTER TABLE public.company_courses
ADD COLUMN IF NOT EXISTS payment_handled_by TEXT DEFAULT 'company' CHECK (payment_handled_by IN ('company', 'employee'));

-- Créer la table des notes de frais
CREATE TABLE IF NOT EXISTS public.expense_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.company_employees(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  facture_id UUID REFERENCES public.factures(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  description TEXT,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  reimbursed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.expense_reports ENABLE ROW LEVEL SECURITY;

-- Policies pour les notes de frais
CREATE POLICY "Employees can view their own expense reports"
ON public.expense_reports FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM public.company_employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Employees can create their own expense reports"
ON public.expense_reports FOR INSERT
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.company_employees WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Companies can view their expense reports"
ON public.expense_reports FOR SELECT
USING (
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Companies can update their expense reports"
ON public.expense_reports FOR UPDATE
USING (
  company_id IN (
    SELECT id FROM public.companies WHERE user_id = auth.uid()
  )
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_expense_reports_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_expense_reports_updated_at
BEFORE UPDATE ON public.expense_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_expense_reports_timestamp();

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_expense_reports_company ON public.expense_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_employee ON public.expense_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_reports_status ON public.expense_reports(status);