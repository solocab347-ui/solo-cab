-- =====================================================
-- NOTIFICATIONS COMPLÈTES POUR COLLABORATEURS ET ENTREPRISES
-- =====================================================

-- 1. Notification au collaborateur quand sa note de frais est approuvée
CREATE OR REPLACE FUNCTION notify_expense_report_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_user_id UUID;
BEGIN
  -- Seulement si le statut passe à "approved"
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Récupérer le user_id de l'employé
    SELECT user_id INTO v_employee_user_id
    FROM company_employees
    WHERE id = NEW.employee_id;

    IF v_employee_user_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        link
      ) VALUES (
        v_employee_user_id,
        '✅ Note de frais approuvée',
        'Votre note de frais de ' || NEW.amount || '€ a été approuvée. Le remboursement sera effectué prochainement.',
        'expense_approved',
        '/company-employee-dashboard?tab=expenses'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_expense_approved_trigger ON expense_reports;
CREATE TRIGGER notify_expense_approved_trigger
  AFTER UPDATE ON expense_reports
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved')
  EXECUTE FUNCTION notify_expense_report_approved();

-- 2. Notification au collaborateur quand sa note de frais est rejetée
CREATE OR REPLACE FUNCTION notify_expense_report_rejected()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_user_id UUID;
BEGIN
  -- Seulement si le statut passe à "rejected"
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    -- Récupérer le user_id de l'employé
    SELECT user_id INTO v_employee_user_id
    FROM company_employees
    WHERE id = NEW.employee_id;

    IF v_employee_user_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        link
      ) VALUES (
        v_employee_user_id,
        '❌ Note de frais refusée',
        'Votre note de frais de ' || NEW.amount || '€ a été refusée.' || COALESCE(' Motif : ' || NEW.rejection_reason, ''),
        'expense_rejected',
        '/company-employee-dashboard?tab=expenses'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_expense_rejected_trigger ON expense_reports;
CREATE TRIGGER notify_expense_rejected_trigger
  AFTER UPDATE ON expense_reports
  FOR EACH ROW
  WHEN (NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected')
  EXECUTE FUNCTION notify_expense_report_rejected();

-- 3. Notification au collaborateur quand sa note de frais est remboursée
CREATE OR REPLACE FUNCTION notify_expense_report_reimbursed()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_user_id UUID;
  v_method_text TEXT;
BEGIN
  -- Seulement si le statut passe à "reimbursed"
  IF NEW.status = 'reimbursed' AND (OLD.status IS NULL OR OLD.status != 'reimbursed') THEN
    -- Récupérer le user_id de l'employé
    SELECT user_id INTO v_employee_user_id
    FROM company_employees
    WHERE id = NEW.employee_id;

    -- Déterminer le texte de la méthode
    IF NEW.reimbursement_method = 'payroll' THEN
      v_method_text := 'avec votre paie';
    ELSE
      v_method_text := 'par virement';
    END IF;

    IF v_employee_user_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        link
      ) VALUES (
        v_employee_user_id,
        '💰 Note de frais remboursée',
        'Votre note de frais de ' || NEW.amount || '€ a été remboursée ' || v_method_text || '.',
        'expense_reimbursed',
        '/company-employee-dashboard?tab=expenses'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_expense_reimbursed_trigger ON expense_reports;
CREATE TRIGGER notify_expense_reimbursed_trigger
  AFTER UPDATE ON expense_reports
  FOR EACH ROW
  WHEN (NEW.status = 'reimbursed' AND OLD.status IS DISTINCT FROM 'reimbursed')
  EXECUTE FUNCTION notify_expense_report_reimbursed();

-- 4. Notification à l'entreprise quand un collaborateur envoie une relance
CREATE OR REPLACE FUNCTION notify_expense_reminder_sent()
RETURNS TRIGGER AS $$
DECLARE
  v_expense RECORD;
  v_company RECORD;
  v_employee_name TEXT;
BEGIN
  -- Récupérer la note de frais
  SELECT * INTO v_expense FROM expense_reports WHERE id = NEW.expense_report_id;
  
  IF v_expense IS NOT NULL THEN
    -- Récupérer l'entreprise
    SELECT * INTO v_company FROM companies WHERE id = v_expense.company_id;
    
    -- Récupérer le nom de l'employé
    SELECT p.full_name INTO v_employee_name
    FROM company_employees ce
    JOIN profiles p ON p.id = ce.user_id
    WHERE ce.id = v_expense.employee_id;

    IF v_company IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        link
      ) VALUES (
        v_company.user_id,
        '🔔 Relance note de frais',
        COALESCE(v_employee_name, 'Un collaborateur') || ' relance pour sa note de frais de ' || v_expense.amount || '€',
        'expense_reminder',
        '/company-dashboard?tab=expenses'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_expense_reminder_trigger ON expense_report_reminders;
CREATE TRIGGER notify_expense_reminder_trigger
  AFTER INSERT ON expense_report_reminders
  FOR EACH ROW
  EXECUTE FUNCTION notify_expense_reminder_sent();

-- 5. Notification au collaborateur quand une course lui est assignée (via company_courses)
CREATE OR REPLACE FUNCTION notify_employee_course_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_user_id UUID;
  v_course RECORD;
BEGIN
  IF NEW.employee_id IS NOT NULL THEN
    -- Récupérer le user_id de l'employé
    SELECT user_id INTO v_employee_user_id
    FROM company_employees
    WHERE id = NEW.employee_id;

    -- Récupérer les infos de la course
    SELECT * INTO v_course FROM courses WHERE id = NEW.course_id;

    IF v_employee_user_id IS NOT NULL AND v_course IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        link
      ) VALUES (
        v_employee_user_id,
        '🚗 Nouvelle course réservée',
        'Une course a été réservée pour vous le ' || to_char(v_course.scheduled_date, 'DD/MM/YYYY à HH24:MI'),
        'course_assigned',
        '/company-employee-dashboard?tab=courses'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_employee_course_assigned_trigger ON company_courses;
CREATE TRIGGER notify_employee_course_assigned_trigger
  AFTER INSERT ON company_courses
  FOR EACH ROW
  WHEN (NEW.employee_id IS NOT NULL)
  EXECUTE FUNCTION notify_employee_course_assigned();

-- 6. Notification au collaborateur quand sa course est acceptée par un chauffeur
CREATE OR REPLACE FUNCTION notify_employee_course_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_company_course RECORD;
  v_employee_user_id UUID;
  v_driver_name TEXT;
BEGIN
  -- Seulement si un driver_id est assigné
  IF NEW.driver_id IS NOT NULL AND (OLD.driver_id IS NULL OR OLD.driver_id != NEW.driver_id) THEN
    -- Vérifier si c'est une course d'entreprise avec un employé
    SELECT * INTO v_company_course FROM company_courses WHERE course_id = NEW.id;
    
    IF v_company_course IS NOT NULL AND v_company_course.employee_id IS NOT NULL THEN
      -- Récupérer le user_id de l'employé
      SELECT user_id INTO v_employee_user_id
      FROM company_employees
      WHERE id = v_company_course.employee_id;

      -- Récupérer le nom du chauffeur
      SELECT p.full_name INTO v_driver_name
      FROM drivers d
      JOIN profiles p ON p.id = d.user_id
      WHERE d.id = NEW.driver_id;

      IF v_employee_user_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          link
        ) VALUES (
          v_employee_user_id,
          '✅ Chauffeur assigné',
          'Votre course du ' || to_char(NEW.scheduled_date, 'DD/MM à HH24:MI') || ' sera effectuée par ' || COALESCE(v_driver_name, 'un chauffeur'),
          'course_driver_assigned',
          '/company-employee-dashboard?tab=courses'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_employee_course_accepted_trigger ON courses;
CREATE TRIGGER notify_employee_course_accepted_trigger
  AFTER UPDATE ON courses
  FOR EACH ROW
  WHEN (NEW.driver_id IS NOT NULL AND OLD.driver_id IS DISTINCT FROM NEW.driver_id)
  EXECUTE FUNCTION notify_employee_course_accepted();

-- 7. Notification au collaborateur quand sa course est terminée
CREATE OR REPLACE FUNCTION notify_employee_course_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_company_course RECORD;
  v_employee_user_id UUID;
BEGIN
  -- Seulement si le statut passe à "completed"
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Vérifier si c'est une course d'entreprise avec un employé
    SELECT * INTO v_company_course FROM company_courses WHERE course_id = NEW.id;
    
    IF v_company_course IS NOT NULL AND v_company_course.employee_id IS NOT NULL THEN
      -- Récupérer le user_id de l'employé
      SELECT user_id INTO v_employee_user_id
      FROM company_employees
      WHERE id = v_company_course.employee_id;

      IF v_employee_user_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          link
        ) VALUES (
          v_employee_user_id,
          '🏁 Course terminée',
          'Votre course vers ' || substring(NEW.destination_address from 1 for 30) || ' est terminée.',
          'course_completed',
          '/company-employee-dashboard?tab=courses'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_employee_course_completed_trigger ON courses;
CREATE TRIGGER notify_employee_course_completed_trigger
  AFTER UPDATE ON courses
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION notify_employee_course_completed();

-- 8. Notification au collaborateur quand sa course est annulée
CREATE OR REPLACE FUNCTION notify_employee_course_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  v_company_course RECORD;
  v_employee_user_id UUID;
BEGIN
  -- Seulement si le statut passe à "cancelled"
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Vérifier si c'est une course d'entreprise avec un employé
    SELECT * INTO v_company_course FROM company_courses WHERE course_id = NEW.id;
    
    IF v_company_course IS NOT NULL AND v_company_course.employee_id IS NOT NULL THEN
      -- Récupérer le user_id de l'employé
      SELECT user_id INTO v_employee_user_id
      FROM company_employees
      WHERE id = v_company_course.employee_id;

      IF v_employee_user_id IS NOT NULL THEN
        INSERT INTO notifications (
          user_id,
          title,
          message,
          type,
          link
        ) VALUES (
          v_employee_user_id,
          '❌ Course annulée',
          'Votre course du ' || to_char(NEW.scheduled_date, 'DD/MM/YYYY à HH24:MI') || ' a été annulée.',
          'course_cancelled',
          '/company-employee-dashboard?tab=courses'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_employee_course_cancelled_trigger ON courses;
CREATE TRIGGER notify_employee_course_cancelled_trigger
  AFTER UPDATE ON courses
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION notify_employee_course_cancelled();