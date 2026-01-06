-- Ajouter le champ max_monthly_budget à la table company_employee_invitations
ALTER TABLE company_employee_invitations 
ADD COLUMN IF NOT EXISTS max_monthly_budget NUMERIC DEFAULT NULL;

-- Modifier le trigger de création d'employé pour prendre en compte le budget de l'invitation
CREATE OR REPLACE FUNCTION copy_invitation_budget_to_employee()
RETURNS TRIGGER AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Chercher l'invitation correspondante
  SELECT * INTO v_invitation 
  FROM company_employee_invitations 
  WHERE id = NEW.invitation_id;
  
  -- Si l'invitation a un budget, le copier
  IF v_invitation IS NOT NULL AND v_invitation.max_monthly_budget IS NOT NULL THEN
    UPDATE company_employees 
    SET max_monthly_budget = v_invitation.max_monthly_budget
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS copy_invitation_budget_trigger ON company_employees;
CREATE TRIGGER copy_invitation_budget_trigger
  AFTER INSERT ON company_employees
  FOR EACH ROW
  WHEN (NEW.invitation_id IS NOT NULL)
  EXECUTE FUNCTION copy_invitation_budget_to_employee();