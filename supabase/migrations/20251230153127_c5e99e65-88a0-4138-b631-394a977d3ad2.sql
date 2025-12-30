-- Ajouter les champs de supervision des collaborateurs
ALTER TABLE public.company_employees
ADD COLUMN IF NOT EXISTS max_monthly_courses INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS monthly_courses_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_objective_amount NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS monthly_objective_courses INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS restrictions_notes TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Créer une fonction pour mettre à jour le compteur de courses mensuelles
CREATE OR REPLACE FUNCTION public.update_employee_monthly_courses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
  v_company_id UUID;
BEGIN
  -- Vérifier si c'est une course entreprise
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
    -- Chercher si cette course est liée à un employé
    SELECT cc.employee_id, cc.company_id INTO v_employee_id, v_company_id
    FROM company_courses cc
    WHERE cc.course_id = NEW.id;
    
    IF v_employee_id IS NOT NULL THEN
      -- Mettre à jour le compteur de courses du mois en cours
      UPDATE company_employees
      SET 
        monthly_courses_count = (
          SELECT COUNT(*)
          FROM company_courses cc
          JOIN courses c ON cc.course_id = c.id
          WHERE cc.employee_id = v_employee_id
          AND c.status = 'completed'
          AND DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
        ),
        last_activity_at = NOW()
      WHERE id = v_employee_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour les courses
DROP TRIGGER IF EXISTS trigger_update_employee_courses ON public.courses;
CREATE TRIGGER trigger_update_employee_courses
AFTER INSERT OR UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_employee_monthly_courses();