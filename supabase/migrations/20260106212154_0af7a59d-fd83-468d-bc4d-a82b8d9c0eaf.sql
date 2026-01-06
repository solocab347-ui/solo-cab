-- Fonction pour récupérer l'ID employee d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_employee_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.company_employees
  WHERE user_id = _user_id
  AND is_active = true
  LIMIT 1
$$;

-- Policy: Les employés peuvent voir leurs propres devis (basé sur company_employee_id)
CREATE POLICY "Employees can view their own devis"
ON public.devis
FOR SELECT
TO authenticated
USING (
  company_employee_id IS NOT NULL
  AND company_employee_id = get_user_employee_id(auth.uid())
);

-- Policy: Les employés peuvent accepter/refuser leurs propres devis
CREATE POLICY "Employees can update their own devis"
ON public.devis
FOR UPDATE
TO authenticated
USING (
  company_employee_id IS NOT NULL
  AND company_employee_id = get_user_employee_id(auth.uid())
)
WITH CHECK (
  company_employee_id IS NOT NULL
  AND company_employee_id = get_user_employee_id(auth.uid())
);