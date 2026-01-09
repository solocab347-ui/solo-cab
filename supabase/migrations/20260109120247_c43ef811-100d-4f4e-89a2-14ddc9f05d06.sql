-- Mise à jour du trigger pour exclure les paiements carte entreprise des notes de frais
CREATE OR REPLACE FUNCTION create_expense_report_for_employee_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_company_course RECORD;
  v_course RECORD;
  v_employee RECORD;
  v_should_create_expense BOOLEAN := false;
BEGIN
  -- Exit if no company
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get course info
  SELECT * INTO v_course FROM public.courses WHERE id = NEW.course_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get company_course info
  SELECT * INTO v_company_course 
  FROM public.company_courses 
  WHERE course_id = NEW.course_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- IMPORTANT: Carte entreprise = pas de note de frais
  -- company_card_spot signifie que l'employé a utilisé la carte pro
  IF v_company_course.actual_payment_method = 'company_card_spot' THEN
    RETURN NEW;
  END IF;

  -- Check conditions for employee-paid scenarios (frais personnels uniquement)
  -- 1. Original conditions
  IF v_course.payment_method_requested IN ('employee_pays', 'employee_expense') 
     OR v_company_course.payment_handled_by = 'employee' THEN
    v_should_create_expense := true;
  END IF;
  
  -- 2. When actual_payment_method indicates employee paid PERSONALLY
  IF v_company_course.actual_payment_method IN ('employee_paid_spot', 'employee_personal') THEN
    v_should_create_expense := true;
  END IF;
  
  -- 3. When client confirmed paid_personal (frais personnels)
  IF v_company_course.client_confirmed_payment_method = 'paid_personal' THEN
    v_should_create_expense := true;
  END IF;

  -- Create expense report if conditions met
  IF v_should_create_expense THEN
    -- Find employee
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
      -- Anti-duplicate check
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
        
        -- Update employee stats
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