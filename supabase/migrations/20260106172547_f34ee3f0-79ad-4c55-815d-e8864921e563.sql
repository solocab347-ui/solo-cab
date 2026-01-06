-- Créer une fonction pour vérifier si l'utilisateur est un collaborateur actif d'une entreprise
CREATE OR REPLACE FUNCTION public.is_company_employee(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_employees
    WHERE user_id = auth.uid()
      AND company_id = p_company_id
      AND is_active = true
      AND (is_suspended IS NULL OR is_suspended = false)
  )
$$;

-- Politique pour permettre aux collaborateurs de voir les accords de leur entreprise
CREATE POLICY "Company employees can view their company agreements"
ON public.company_driver_agreements
FOR SELECT
USING (
  company_id IN (
    SELECT company_id 
    FROM public.company_employees 
    WHERE user_id = auth.uid() 
      AND is_active = true 
      AND (is_suspended IS NULL OR is_suspended = false)
  )
);

-- Politique pour permettre aux collaborateurs avec permission d'inviter des chauffeurs de créer des propositions
CREATE POLICY "Company employees with permission can create proposals"
ON public.company_driver_agreements
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.company_employees 
    WHERE user_id = auth.uid() 
      AND company_id = company_driver_agreements.company_id
      AND is_active = true 
      AND can_invite_drivers = true
      AND (is_suspended IS NULL OR is_suspended = false)
  )
  AND proposed_by = 'company'
);