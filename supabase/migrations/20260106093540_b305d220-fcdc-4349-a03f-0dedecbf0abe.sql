-- Créer une fonction SECURITY DEFINER pour vérifier les invitations valides
CREATE OR REPLACE FUNCTION public.is_valid_employee_invitation(p_company_id uuid, p_invitation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_employee_invitations
    WHERE id = p_invitation_id
      AND company_id = p_company_id
      AND is_used = false
      AND expires_at > NOW()
  )
$$;

-- Ajouter une politique INSERT pour les utilisateurs avec une invitation valide
CREATE POLICY "Users can insert their own employee record via invitation"
ON public.company_employees
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_valid_employee_invitation(company_id, invitation_id)
);

-- Ajouter également une politique pour les admins d'entreprise
CREATE OR REPLACE FUNCTION public.is_company_admin_for_employees(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_administrators
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND is_active = true
  )
$$;

-- Politique INSERT pour les admins d'entreprise
CREATE POLICY "Company admins can insert employees"
ON public.company_employees
FOR INSERT
TO authenticated
WITH CHECK (
  is_company_admin_for_employees(company_id)
);