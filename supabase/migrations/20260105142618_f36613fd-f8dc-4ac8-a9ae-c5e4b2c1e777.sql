
-- =====================================================
-- WORKFLOW 3: Employé qui réserve lui-même - CORRECTIONS
-- =====================================================

-- 1. Fonction pour créer automatiquement une note de frais 
--    quand une facture est créée pour une course d'entreprise payée par l'employé
CREATE OR REPLACE FUNCTION create_expense_report_for_employee_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_company_course RECORD;
  v_course RECORD;
  v_employee RECORD;
BEGIN
  -- Vérifier si c'est une facture entreprise
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Récupérer les infos de la course
  SELECT * INTO v_course FROM courses WHERE id = NEW.course_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Récupérer le lien company_courses
  SELECT * INTO v_company_course 
  FROM company_courses 
  WHERE course_id = NEW.course_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Vérifier si l'employé a payé (via payment_method_requested ou payment_handled_by)
  IF v_course.payment_method_requested IN ('employee_pays', 'employee_expense') 
     OR v_company_course.payment_handled_by = 'employee' THEN
    
    -- Récupérer l'employé (soit via company_course, soit via client_id)
    IF v_company_course.employee_id IS NOT NULL THEN
      SELECT * INTO v_employee 
      FROM company_employees 
      WHERE id = v_company_course.employee_id;
    ELSIF v_course.client_id IS NOT NULL THEN
      SELECT ce.* INTO v_employee
      FROM company_employees ce
      JOIN clients c ON c.user_id = ce.user_id
      WHERE c.id = v_course.client_id
      AND ce.company_id = NEW.company_id
      AND ce.is_active = true;
    END IF;
    
    IF v_employee IS NOT NULL THEN
      -- Vérifier qu'une expense_report n'existe pas déjà
      IF NOT EXISTS (
        SELECT 1 FROM expense_reports 
        WHERE course_id = NEW.course_id
      ) THEN
        -- Créer la note de frais
        INSERT INTO expense_reports (
          company_id,
          employee_id,
          course_id,
          facture_id,
          amount,
          payment_method,
          description,
          status,
          submitted_at
        ) VALUES (
          NEW.company_id,
          v_employee.id,
          NEW.course_id,
          NEW.id,
          NEW.amount,
          COALESCE(v_course.payment_method_used, v_course.payment_method_requested, 'other'),
          'Course du ' || to_char(v_course.scheduled_date, 'DD/MM/YYYY HH24:MI'),
          'pending',
          now()
        );
        
        -- Mettre à jour les dépenses du mois de l'employé
        UPDATE company_employees 
        SET current_month_spent = COALESCE(current_month_spent, 0) + NEW.amount,
            monthly_courses_count = COALESCE(monthly_courses_count, 0) + 1
        WHERE id = v_employee.id;
        
        RAISE NOTICE 'Note de frais créée pour employé % - montant %', v_employee.id, NEW.amount;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger sur factures pour créer expense_report
DROP TRIGGER IF EXISTS create_expense_report_trigger ON factures;
CREATE TRIGGER create_expense_report_trigger
  AFTER INSERT ON factures
  FOR EACH ROW
  EXECUTE FUNCTION create_expense_report_for_employee_payment();

-- 3. Fonction pour lier automatiquement une course à company_courses
--    quand le client est aussi un employé d'entreprise
CREATE OR REPLACE FUNCTION auto_link_employee_course()
RETURNS TRIGGER AS $$
DECLARE
  v_employee RECORD;
BEGIN
  -- Ne traiter que les nouvelles courses avec un client_id
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Vérifier si le client est aussi un employé d'entreprise actif
  SELECT ce.* INTO v_employee
  FROM company_employees ce
  JOIN clients c ON c.user_id = ce.user_id
  WHERE c.id = NEW.client_id
  AND ce.is_active = true
  AND ce.is_suspended IS NOT TRUE
  LIMIT 1;

  IF v_employee IS NOT NULL THEN
    -- Vérifier qu'un lien n'existe pas déjà
    IF NOT EXISTS (
      SELECT 1 FROM company_courses WHERE course_id = NEW.id
    ) THEN
      -- Créer le lien company_courses
      INSERT INTO company_courses (
        company_id,
        course_id,
        employee_id,
        created_by_employee,
        invoice_to_company,
        payment_handled_by
      ) VALUES (
        v_employee.company_id,
        NEW.id,
        v_employee.id,
        true,
        CASE 
          WHEN NEW.payment_method_requested IN ('company_pays', 'invoice_company') THEN true
          ELSE false
        END,
        CASE 
          WHEN NEW.payment_method_requested IN ('employee_pays', 'employee_expense') THEN 'employee'
          ELSE 'company'
        END
      );
      
      RAISE NOTICE 'Course % liée automatiquement à l''entreprise % pour employé %', 
                   NEW.id, v_employee.company_id, v_employee.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger sur courses pour lier automatiquement
DROP TRIGGER IF EXISTS auto_link_employee_course_trigger ON courses;
CREATE TRIGGER auto_link_employee_course_trigger
  AFTER INSERT ON courses
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_employee_course();

-- 5. Ajouter colonne payment_handled_by à company_courses si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'company_courses' 
    AND column_name = 'payment_handled_by'
  ) THEN
    ALTER TABLE company_courses 
    ADD COLUMN payment_handled_by TEXT DEFAULT 'company';
  END IF;
END $$;

-- 6. Notifier l'entreprise quand une note de frais est créée
CREATE OR REPLACE FUNCTION notify_expense_report_created()
RETURNS TRIGGER AS $$
DECLARE
  v_company RECORD;
  v_employee_name TEXT;
BEGIN
  -- Récupérer les infos de l'entreprise
  SELECT * INTO v_company FROM companies WHERE id = NEW.company_id;
  
  -- Récupérer le nom de l'employé
  SELECT p.full_name INTO v_employee_name
  FROM company_employees ce
  JOIN profiles p ON p.id = ce.user_id
  WHERE ce.id = NEW.employee_id;

  IF v_company IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      link
    ) VALUES (
      v_company.user_id,
      '📋 Nouvelle note de frais',
      COALESCE(v_employee_name, 'Un collaborateur') || ' a soumis une note de frais de ' || NEW.amount || '€',
      'expense_report',
      '/company-dashboard?tab=expenses'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour notification
DROP TRIGGER IF EXISTS notify_expense_report_trigger ON expense_reports;
CREATE TRIGGER notify_expense_report_trigger
  AFTER INSERT ON expense_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_expense_report_created();
