-- Fix the notify_company_course_completed trigger to not reference non-existent 'price' field
CREATE OR REPLACE FUNCTION public.notify_company_course_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_course RECORD;
  v_agreement RECORD;
  v_driver RECORD;
  v_course_amount NUMERIC;
  v_facture_id UUID;
BEGIN
  -- Seulement quand le statut passe à 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Vérifier si c'est une course entreprise via company_courses
    SELECT cc.*, c.company_name, c.contact_email, c.user_id as company_user_id
    INTO v_company_course
    FROM company_courses cc
    JOIN companies c ON c.id = cc.company_id
    WHERE cc.course_id = NEW.id
    LIMIT 1;
    
    IF v_company_course.id IS NOT NULL THEN
      -- Récupérer le contrat actif
      SELECT cda.*
      INTO v_agreement
      FROM company_driver_agreements cda
      WHERE cda.company_id = v_company_course.company_id
        AND cda.driver_id = NEW.driver_id
        AND cda.status = 'accepted'
      LIMIT 1;
      
      IF v_agreement.id IS NOT NULL THEN
        -- Récupérer les infos du chauffeur
        SELECT d.*, p.full_name, p.email as driver_email
        INTO v_driver
        FROM drivers d
        JOIN profiles p ON p.id = d.user_id
        WHERE d.id = NEW.driver_id;
        
        -- Récupérer le montant depuis la facture OU depuis le devis
        SELECT id, amount INTO v_facture_id, v_course_amount
        FROM factures
        WHERE course_id = NEW.id
        LIMIT 1;
        
        -- If no facture yet, try to get amount from devis
        IF v_course_amount IS NULL THEN
          SELECT amount INTO v_course_amount
          FROM devis
          WHERE course_id = NEW.id AND status = 'accepted'
          LIMIT 1;
        END IF;
        
        -- Default to 0 if nothing found
        v_course_amount := COALESCE(v_course_amount, 0);
        
        -- Mettre à jour le solde impayé de l'accord
        UPDATE company_driver_agreements
        SET 
          outstanding_balance = COALESCE(outstanding_balance, 0) + v_course_amount,
          total_billed = COALESCE(total_billed, 0) + v_course_amount,
          updated_at = NOW()
        WHERE id = v_agreement.id;
        
        -- Si paiement par course, notifier immédiatement
        IF v_agreement.payment_frequency = 'per_course' THEN
          -- Créer un paiement pending
          INSERT INTO company_payments (
            company_id,
            driver_id,
            agreement_id,
            amount,
            payment_method,
            status,
            course_ids,
            courses_count
          ) VALUES (
            v_company_course.company_id,
            NEW.driver_id,
            v_agreement.id,
            v_course_amount,
            COALESCE(v_agreement.payment_methods[1], 'bank_transfer'),
            'pending',
            ARRAY[NEW.id],
            1
          );
          
          -- Notifier l'entreprise
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (
            v_company_course.company_user_id,
            '💳 Paiement requis',
            'Course terminée avec ' || v_driver.full_name || '. Montant: ' || v_course_amount || '€',
            'payment_due',
            '/company-dashboard?tab=payments'
          );
          
          -- Notifier le chauffeur
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (
            v_driver.user_id,
            '✅ Course entreprise terminée',
            'Course pour ' || v_company_course.company_name || ' terminée. Paiement à venir: ' || v_course_amount || '€',
            'payment',
            '/driver-dashboard?tab=company-payments'
          );
          
          -- Mettre à jour next_payment_due
          UPDATE company_driver_agreements
          SET next_payment_due = NOW() + INTERVAL '3 days'
          WHERE id = v_agreement.id 
            AND (next_payment_due IS NULL OR next_payment_due < NOW());
        ELSE
          -- Pour weekly/monthly, juste notifier que la course est ajoutée au récap
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (
            v_driver.user_id,
            '📋 Course ajoutée au récap',
            'Course pour ' || v_company_course.company_name || ' (' || v_course_amount || '€) ajoutée à votre paiement ' || 
            CASE v_agreement.payment_frequency 
              WHEN 'weekly' THEN 'hebdomadaire'
              WHEN 'monthly' THEN 'mensuel'
              ELSE 'périodique'
            END,
            'payment',
            '/driver-dashboard?tab=company-payments'
          );
          
          -- Notifier aussi l'entreprise
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (
            v_company_course.company_user_id,
            '📋 Course ajoutée',
            'Course avec ' || v_driver.full_name || ' (' || v_course_amount || '€) ajoutée au prochain récapitulatif',
            'info',
            '/company-dashboard?tab=payments'
          );
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;