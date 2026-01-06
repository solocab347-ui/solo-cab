-- Trigger pour notifier quand un collaborateur atteint 80% de son budget
CREATE OR REPLACE FUNCTION notify_employee_budget_threshold()
RETURNS TRIGGER AS $$
DECLARE
  v_employee RECORD;
  v_company RECORD;
  v_employee_name TEXT;
  v_percentage NUMERIC;
BEGIN
  -- Récupérer les infos de l'employé
  SELECT * INTO v_employee FROM company_employees WHERE id = NEW.employee_id;
  
  IF v_employee IS NOT NULL AND v_employee.max_monthly_budget IS NOT NULL AND v_employee.max_monthly_budget > 0 THEN
    -- Calculer le nouveau pourcentage avec cette dépense
    v_percentage := ((v_employee.current_month_spent + NEW.amount) / v_employee.max_monthly_budget) * 100;
    
    -- Récupérer le nom de l'employé
    SELECT p.full_name INTO v_employee_name
    FROM profiles p
    WHERE p.id = v_employee.user_id;
    
    -- Récupérer l'entreprise
    SELECT * INTO v_company FROM companies WHERE id = v_employee.company_id;
    
    -- Notification à 80%
    IF v_percentage >= 80 AND v_percentage < 100 AND 
       ((v_employee.current_month_spent / v_employee.max_monthly_budget) * 100) < 80 THEN
      -- Notifier l'employé
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_employee.user_id,
        '⚠️ Budget à 80%',
        'Vous avez utilisé 80% de votre budget mensuel (' || v_employee.max_monthly_budget || '€). Il vous reste ' || ROUND(v_employee.max_monthly_budget - v_employee.current_month_spent - NEW.amount, 2) || '€.',
        'budget_warning',
        '/company-employee-dashboard'
      );
      
      -- Notifier l'admin de l'entreprise
      IF v_company IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          v_company.user_id,
          '⚠️ Collaborateur à 80% du budget',
          COALESCE(v_employee_name, 'Un collaborateur') || ' a atteint 80% de son budget mensuel de ' || v_employee.max_monthly_budget || '€.',
          'employee_budget_warning',
          '/company-dashboard?tab=employees'
        );
      END IF;
    END IF;
    
    -- Notification à 100% (dépassement)
    IF v_percentage >= 100 AND 
       ((v_employee.current_month_spent / v_employee.max_monthly_budget) * 100) < 100 THEN
      -- Notifier l'employé
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_employee.user_id,
        '🚨 Budget dépassé !',
        'Vous avez atteint votre limite de budget mensuel de ' || v_employee.max_monthly_budget || '€.',
        'budget_exceeded',
        '/company-employee-dashboard'
      );
      
      -- Notifier l'admin de l'entreprise
      IF v_company IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          v_company.user_id,
          '🚨 Budget dépassé par collaborateur',
          COALESCE(v_employee_name, 'Un collaborateur') || ' a dépassé son budget mensuel de ' || v_employee.max_monthly_budget || '€.',
          'employee_budget_exceeded',
          '/company-dashboard?tab=employees'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger sur expense_reports pour vérifier le budget
DROP TRIGGER IF EXISTS check_budget_on_expense_trigger ON expense_reports;
CREATE TRIGGER check_budget_on_expense_trigger
  AFTER INSERT ON expense_reports
  FOR EACH ROW
  WHEN (NEW.status = 'approved' OR NEW.status = 'reimbursed')
  EXECUTE FUNCTION notify_employee_budget_threshold();

-- Trigger aussi quand une note de frais est approuvée
CREATE OR REPLACE FUNCTION notify_budget_on_expense_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_employee RECORD;
  v_company RECORD;
  v_employee_name TEXT;
  v_new_total NUMERIC;
  v_percentage NUMERIC;
BEGIN
  -- Seulement si le statut passe à approved ou reimbursed
  IF (NEW.status IN ('approved', 'reimbursed') AND OLD.status NOT IN ('approved', 'reimbursed')) THEN
    -- Récupérer les infos de l'employé
    SELECT * INTO v_employee FROM company_employees WHERE id = NEW.employee_id;
    
    IF v_employee IS NOT NULL AND v_employee.max_monthly_budget IS NOT NULL AND v_employee.max_monthly_budget > 0 THEN
      -- Calculer le nouveau total
      v_new_total := v_employee.current_month_spent + NEW.amount;
      v_percentage := (v_new_total / v_employee.max_monthly_budget) * 100;
      
      -- Mettre à jour le montant dépensé
      UPDATE company_employees 
      SET current_month_spent = v_new_total
      WHERE id = NEW.employee_id;
      
      -- Récupérer le nom de l'employé
      SELECT p.full_name INTO v_employee_name
      FROM profiles p
      WHERE p.id = v_employee.user_id;
      
      -- Récupérer l'entreprise
      SELECT * INTO v_company FROM companies WHERE id = v_employee.company_id;
      
      -- Notification à 80%
      IF v_percentage >= 80 AND v_percentage < 100 AND 
         ((v_employee.current_month_spent / v_employee.max_monthly_budget) * 100) < 80 THEN
        -- Notifier l'employé
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          v_employee.user_id,
          '⚠️ Budget à 80%',
          'Vous avez utilisé 80% de votre budget mensuel. Il vous reste ' || ROUND(v_employee.max_monthly_budget - v_new_total, 2) || '€.',
          'budget_warning',
          '/company-employee-dashboard'
        );
        
        -- Notifier l'admin
        IF v_company IS NOT NULL THEN
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (
            v_company.user_id,
            '⚠️ Collaborateur à 80% du budget',
            COALESCE(v_employee_name, 'Un collaborateur') || ' a atteint 80% de son budget mensuel.',
            'employee_budget_warning',
            '/company-dashboard?tab=employees'
          );
        END IF;
      END IF;
      
      -- Notification à 100%
      IF v_percentage >= 100 AND 
         ((v_employee.current_month_spent / v_employee.max_monthly_budget) * 100) < 100 THEN
        -- Notifier l'employé
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          v_employee.user_id,
          '🚨 Budget dépassé !',
          'Vous avez atteint votre limite de budget mensuel de ' || v_employee.max_monthly_budget || '€.',
          'budget_exceeded',
          '/company-employee-dashboard'
        );
        
        -- Notifier l'admin
        IF v_company IS NOT NULL THEN
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (
            v_company.user_id,
            '🚨 Budget dépassé par collaborateur',
            COALESCE(v_employee_name, 'Un collaborateur') || ' a dépassé son budget mensuel.',
            'employee_budget_exceeded',
            '/company-dashboard?tab=employees'
          );
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS notify_budget_on_approval_trigger ON expense_reports;
CREATE TRIGGER notify_budget_on_approval_trigger
  AFTER UPDATE ON expense_reports
  FOR EACH ROW
  WHEN (NEW.status IN ('approved', 'reimbursed') AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_budget_on_expense_approval();