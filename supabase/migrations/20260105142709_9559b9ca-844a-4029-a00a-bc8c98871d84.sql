
-- Correction des avertissements de sécurité: ajout de search_path aux fonctions

-- 1. Corriger create_expense_report_for_employee_payment
CREATE OR REPLACE FUNCTION create_expense_report_for_employee_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_company_course RECORD;
  v_course RECORD;
  v_employee RECORD;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_course FROM public.courses WHERE id = NEW.course_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_company_course 
  FROM public.company_courses 
  WHERE course_id = NEW.course_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_course.payment_method_requested IN ('employee_pays', 'employee_expense') 
     OR v_company_course.payment_handled_by = 'employee' THEN
    
    IF v_company_course.employee_id IS NOT NULL THEN
      SELECT * INTO v_employee 
      FROM public.company_employees 
      WHERE id = v_company_course.employee_id;
    ELSIF v_course.client_id IS NOT NULL THEN
      SELECT ce.* INTO v_employee
      FROM public.company_employees ce
      JOIN public.clients c ON c.user_id = ce.user_id
      WHERE c.id = v_course.client_id
      AND ce.company_id = NEW.company_id
      AND ce.is_active = true;
    END IF;
    
    IF v_employee IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.expense_reports 
        WHERE course_id = NEW.course_id
      ) THEN
        INSERT INTO public.expense_reports (
          company_id, employee_id, course_id, facture_id,
          amount, payment_method, description, status, submitted_at
        ) VALUES (
          NEW.company_id, v_employee.id, NEW.course_id, NEW.id,
          NEW.amount,
          COALESCE(v_course.payment_method_used, v_course.payment_method_requested, 'other'),
          'Course du ' || to_char(v_course.scheduled_date, 'DD/MM/YYYY HH24:MI'),
          'pending', now()
        );
        
        UPDATE public.company_employees 
        SET current_month_spent = COALESCE(current_month_spent, 0) + NEW.amount,
            monthly_courses_count = COALESCE(monthly_courses_count, 0) + 1
        WHERE id = v_employee.id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Corriger auto_link_employee_course
CREATE OR REPLACE FUNCTION auto_link_employee_course()
RETURNS TRIGGER AS $$
DECLARE
  v_employee RECORD;
BEGIN
  IF NEW.client_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ce.* INTO v_employee
  FROM public.company_employees ce
  JOIN public.clients c ON c.user_id = ce.user_id
  WHERE c.id = NEW.client_id
  AND ce.is_active = true
  AND ce.is_suspended IS NOT TRUE
  LIMIT 1;

  IF v_employee IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.company_courses WHERE course_id = NEW.id
    ) THEN
      INSERT INTO public.company_courses (
        company_id, course_id, employee_id, created_by_employee,
        invoice_to_company, payment_handled_by
      ) VALUES (
        v_employee.company_id, NEW.id, v_employee.id, true,
        CASE 
          WHEN NEW.payment_method_requested IN ('company_pays', 'invoice_company') THEN true
          ELSE false
        END,
        CASE 
          WHEN NEW.payment_method_requested IN ('employee_pays', 'employee_expense') THEN 'employee'
          ELSE 'company'
        END
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Corriger notify_expense_report_created
CREATE OR REPLACE FUNCTION notify_expense_report_created()
RETURNS TRIGGER AS $$
DECLARE
  v_company RECORD;
  v_employee_name TEXT;
BEGIN
  SELECT * INTO v_company FROM public.companies WHERE id = NEW.company_id;
  
  SELECT p.full_name INTO v_employee_name
  FROM public.company_employees ce
  JOIN public.profiles p ON p.id = ce.user_id
  WHERE ce.id = NEW.employee_id;

  IF v_company IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_company.user_id,
      '📋 Nouvelle note de frais',
      COALESCE(v_employee_name, 'Un collaborateur') || ' a soumis une note de frais de ' || NEW.amount || '€',
      'expense_report',
      '/company-dashboard?tab=expenses'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
