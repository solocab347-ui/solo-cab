-- Supprimer la politique qui cause la récursion infinie
DROP POLICY IF EXISTS "Drivers can view employees for their company courses" ON public.company_employees;

-- Créer une fonction SECURITY DEFINER pour récupérer les infos employés sans déclencher les RLS
CREATE OR REPLACE FUNCTION public.get_employee_profile_for_course(p_employee_id uuid)
RETURNS TABLE (
  employee_id uuid,
  full_name text,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id as employee_id,
    p.full_name,
    p.phone
  FROM company_employees ce
  JOIN profiles p ON p.id = ce.user_id
  WHERE ce.id = p_employee_id;
END;
$$;