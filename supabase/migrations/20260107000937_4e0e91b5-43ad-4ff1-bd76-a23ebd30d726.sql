-- Ajouter une politique RLS pour permettre aux employés de voir les demandes qui leur sont assignées
CREATE POLICY "Employees can view their assigned course requests"
ON public.company_course_requests
FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM company_employees 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);