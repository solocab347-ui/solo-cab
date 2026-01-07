-- First, set invitation_id to null in company_employees where the invitation is used
-- This allows us to safely delete the used invitations

-- Update existing records to clear the invitation_id reference
UPDATE public.company_employees 
SET invitation_id = NULL 
WHERE invitation_id IN (
  SELECT id FROM public.company_employee_invitations WHERE is_used = true
);

-- Now delete the used invitations
DELETE FROM public.company_employee_invitations WHERE is_used = true;

-- Create or replace the trigger function to handle future used invitations
CREATE OR REPLACE FUNCTION public.delete_used_employee_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- When an invitation is marked as used, first clear the reference then delete
  IF NEW.is_used = true AND OLD.is_used = false THEN
    -- Clear the reference in company_employees
    UPDATE public.company_employees 
    SET invitation_id = NULL 
    WHERE invitation_id = NEW.id;
    
    -- Delete the invitation since it's now used
    DELETE FROM public.company_employee_invitations WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger that fires after an invitation is updated to is_used = true
DROP TRIGGER IF EXISTS on_employee_invitation_used ON public.company_employee_invitations;
CREATE TRIGGER on_employee_invitation_used
  AFTER UPDATE OF is_used ON public.company_employee_invitations
  FOR EACH ROW
  WHEN (NEW.is_used = true AND OLD.is_used = false)
  EXECUTE FUNCTION public.delete_used_employee_invitation();