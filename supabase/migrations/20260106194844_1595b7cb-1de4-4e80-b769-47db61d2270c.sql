-- Créer une fonction pour vérifier si l'utilisateur est employé d'une entreprise partenaire d'un chauffeur
CREATE OR REPLACE FUNCTION public.is_company_employee_of_driver(p_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM company_employees ce
    JOIN company_driver_agreements cda ON cda.company_id = ce.company_id
    WHERE ce.user_id = auth.uid()
      AND ce.is_active = true
      AND ce.is_suspended IS NOT TRUE
      AND cda.driver_id = p_driver_id
      AND cda.status = 'accepted'
  )
  OR EXISTS (
    SELECT 1
    FROM company_administrators ca
    JOIN company_driver_agreements cda ON cda.company_id = ca.company_id
    WHERE ca.user_id = auth.uid()
      AND ca.is_active = true
      AND cda.driver_id = p_driver_id
      AND cda.status = 'accepted'
  )
$$;

-- Policy pour permettre aux employés d'entreprise de créer des courses avec leurs chauffeurs partenaires
CREATE POLICY "Company employees can create courses with partner drivers"
ON public.courses
FOR INSERT
WITH CHECK (
  public.is_company_employee_of_driver(driver_id)
);