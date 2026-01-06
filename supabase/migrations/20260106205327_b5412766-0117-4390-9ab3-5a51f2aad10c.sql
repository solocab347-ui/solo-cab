-- Modifier la fonction is_company_course pour inclure les employés
CREATE OR REPLACE FUNCTION public.is_company_course(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_courses cc
    JOIN companies comp ON cc.company_id = comp.id
    WHERE cc.course_id = _course_id
    AND (
      -- Propriétaire de l'entreprise
      comp.user_id = _user_id
      -- OU administrateur de l'entreprise
      OR EXISTS (
        SELECT 1 FROM company_administrators ca
        WHERE ca.company_id = comp.id
        AND ca.user_id = _user_id
        AND ca.is_active = true
      )
      -- OU employé de l'entreprise qui a créé cette course
      OR EXISTS (
        SELECT 1 FROM company_employees ce
        JOIN courses c ON c.id = cc.course_id
        WHERE ce.company_id = comp.id
        AND ce.user_id = _user_id
        AND ce.is_active = true
        AND (
          ce.id = cc.employee_id
          OR c.created_by_user_id = _user_id
        )
      )
    )
  )
$$;