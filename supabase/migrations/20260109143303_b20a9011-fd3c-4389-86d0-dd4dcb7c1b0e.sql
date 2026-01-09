-- Table pour les demandes de promotion de collaborateur géré vers collaborateur autonome
CREATE TABLE public.employee_role_upgrade_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.company_employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  response_message TEXT,
  responded_by UUID,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_role_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Employees can view their own upgrade requests"
ON public.employee_role_upgrade_requests
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Employees can create upgrade requests"
ON public.employee_role_upgrade_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Company admins can view upgrade requests for their company"
ON public.employee_role_upgrade_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM companies WHERE id = company_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM company_administrators WHERE company_id = employee_role_upgrade_requests.company_id AND user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company admins can update upgrade requests for their company"
ON public.employee_role_upgrade_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM companies WHERE id = company_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM company_administrators WHERE company_id = employee_role_upgrade_requests.company_id AND user_id = auth.uid() AND is_active = true
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_employee_role_upgrade_requests_updated_at
BEFORE UPDATE ON public.employee_role_upgrade_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_role_upgrade_requests;