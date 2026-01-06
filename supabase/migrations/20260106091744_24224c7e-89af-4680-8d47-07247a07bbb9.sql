
-- =====================================================
-- CORRECTIONS DU SYSTÈME DE FACTURATION ENTREPRISE
-- =====================================================

-- 1. Corriger le trigger pour les courses entreprise terminées
-- Utilise company_courses au lieu de courses.company_id
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
        
        -- Récupérer le montant de la facture
        SELECT id, amount INTO v_facture_id, v_course_amount
        FROM factures
        WHERE course_id = NEW.id
        LIMIT 1;
        
        v_course_amount := COALESCE(v_course_amount, NEW.price, 0);
        
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

-- 2. Améliorer la fonction de génération des récaps périodiques
-- pour utiliser company_courses correctement
CREATE OR REPLACE FUNCTION public.generate_periodic_payment_summaries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement RECORD;
  v_period_start DATE;
  v_period_end DATE;
  v_total_amount NUMERIC;
  v_course_count INTEGER;
  v_course_ids UUID[];
  v_is_period_end BOOLEAN;
BEGIN
  -- Parcourir les contrats actifs avec paiement périodique
  FOR v_agreement IN
    SELECT 
      cda.*,
      c.company_name,
      c.user_id as company_user_id,
      d.user_id as driver_user_id,
      p.full_name as driver_name
    FROM company_driver_agreements cda
    JOIN companies c ON c.id = cda.company_id
    JOIN drivers d ON d.id = cda.driver_id
    JOIN profiles p ON p.id = d.user_id
    WHERE cda.status = 'accepted'
      AND cda.payment_frequency IN ('weekly', 'monthly')
  LOOP
    v_is_period_end := FALSE;
    
    -- Calculer la période selon la fréquence
    IF v_agreement.payment_frequency = 'weekly' THEN
      v_period_start := date_trunc('week', NOW())::DATE;
      v_period_end := (date_trunc('week', NOW()) + INTERVAL '6 days')::DATE;
      
      -- Vérifier si c'est le jour de paiement configuré (défaut: dimanche = 0)
      v_is_period_end := EXTRACT(DOW FROM NOW()) = COALESCE(v_agreement.payment_day, 0);
    ELSE -- monthly
      v_period_start := date_trunc('month', NOW())::DATE;
      v_period_end := (date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      
      -- Vérifier si c'est le jour de paiement configuré
      v_is_period_end := EXTRACT(DAY FROM NOW()) = COALESCE(v_agreement.payment_day, EXTRACT(DAY FROM v_period_end));
    END IF;
    
    IF NOT v_is_period_end THEN
      CONTINUE;
    END IF;
    
    -- Vérifier si un paiement existe déjà pour cette période
    IF EXISTS (
      SELECT 1 FROM company_payments 
      WHERE agreement_id = v_agreement.id 
        AND period_start = v_period_start 
        AND period_end = v_period_end
    ) THEN
      CONTINUE;
    END IF;
    
    -- Calculer le total via company_courses et factures
    SELECT 
      COALESCE(SUM(f.amount), 0),
      COUNT(DISTINCT co.id),
      ARRAY_AGG(DISTINCT co.id)
    INTO v_total_amount, v_course_count, v_course_ids
    FROM company_courses cc
    JOIN courses co ON co.id = cc.course_id
    LEFT JOIN factures f ON f.course_id = co.id AND f.driver_id = v_agreement.driver_id
    WHERE cc.company_id = v_agreement.company_id
      AND co.driver_id = v_agreement.driver_id
      AND co.status = 'completed'
      AND co.scheduled_date::DATE BETWEEN v_period_start AND v_period_end
      AND (f.payment_status IS NULL OR f.payment_status != 'paid');
    
    -- Si des courses existent pour cette période
    IF v_course_count > 0 AND v_total_amount > 0 THEN
      -- Créer le paiement groupé
      INSERT INTO company_payments (
        company_id,
        driver_id,
        agreement_id,
        amount,
        payment_method,
        status,
        period_start,
        period_end,
        course_ids,
        courses_count
      ) VALUES (
        v_agreement.company_id,
        v_agreement.driver_id,
        v_agreement.id,
        v_total_amount,
        COALESCE(v_agreement.payment_methods[1], 'bank_transfer'),
        'pending',
        v_period_start,
        v_period_end,
        v_course_ids,
        v_course_count
      );
      
      -- Notifier l'entreprise
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_agreement.company_user_id,
        '📊 Récapitulatif de paiement',
        v_course_count || ' courses avec ' || v_agreement.driver_name || '. Total: ' || v_total_amount || '€',
        'payment_due',
        '/company-dashboard?tab=payments'
      );
      
      -- Notifier le chauffeur
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_agreement.driver_user_id,
        '📊 Paiement ' || 
        CASE v_agreement.payment_frequency 
          WHEN 'weekly' THEN 'hebdomadaire'
          WHEN 'monthly' THEN 'mensuel'
        END || ' en attente',
        v_agreement.company_name || ': ' || v_total_amount || '€ pour ' || v_course_count || ' courses',
        'payment',
        '/driver-dashboard?tab=company-payments'
      );
      
      -- Mettre à jour next_payment_due
      UPDATE company_driver_agreements
      SET 
        next_payment_due = CASE 
          WHEN payment_frequency = 'weekly' THEN NOW() + INTERVAL '7 days'
          WHEN payment_frequency = 'monthly' THEN NOW() + INTERVAL '1 month'
          ELSE NOW() + INTERVAL '7 days'
        END,
        updated_at = NOW()
      WHERE id = v_agreement.id;
    END IF;
  END LOOP;
END;
$$;

-- 3. Améliorer les relances graduées avec plus de contexte
CREATE OR REPLACE FUNCTION public.send_graduated_payment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_days_overdue INTEGER;
  v_reminder_level INTEGER;
  v_last_reminder_level INTEGER;
BEGIN
  -- Parcourir les paiements en attente avec date d'échéance dépassée
  FOR v_payment IN
    SELECT 
      cp.*,
      cda.id as agreement_id,
      cda.payment_frequency,
      c.company_name,
      c.user_id as company_user_id,
      c.contact_email as company_email,
      c.contact_name as company_contact,
      d.user_id as driver_user_id,
      p.full_name as driver_name,
      p.email as driver_email
    FROM company_payments cp
    JOIN company_driver_agreements cda ON cda.id = cp.agreement_id
    JOIN companies c ON c.id = cp.company_id
    JOIN drivers d ON d.id = cp.driver_id
    JOIN profiles p ON p.id = d.user_id
    WHERE cp.status = 'pending'
      AND cp.created_at < NOW() - INTERVAL '1 day'
  LOOP
    v_days_overdue := EXTRACT(DAY FROM NOW() - v_payment.created_at)::INTEGER;
    
    -- Déterminer le niveau de relance
    IF v_days_overdue >= 7 THEN
      v_reminder_level := 3;
    ELSIF v_days_overdue >= 3 THEN
      v_reminder_level := 2;
    ELSIF v_days_overdue >= 1 THEN
      v_reminder_level := 1;
    ELSE
      CONTINUE;
    END IF;
    
    -- Vérifier si une relance de ce niveau a déjà été envoyée pour ce paiement
    SELECT MAX(reminder_level) INTO v_last_reminder_level
    FROM company_payment_reminders
    WHERE agreement_id = v_payment.agreement_id
      AND period_start = v_payment.period_start
      AND period_end = v_payment.period_end
      AND sent_at > NOW() - INTERVAL '30 days';
    
    IF v_last_reminder_level IS NOT NULL AND v_last_reminder_level >= v_reminder_level THEN
      CONTINUE;
    END IF;
    
    -- Créer l'entrée de relance
    INSERT INTO company_payment_reminders (
      agreement_id,
      company_id,
      driver_id,
      reminder_level,
      amount_due,
      period_start,
      period_end,
      notification_sent
    ) VALUES (
      v_payment.agreement_id,
      v_payment.company_id,
      v_payment.driver_id,
      v_reminder_level,
      v_payment.amount,
      v_payment.period_start,
      v_payment.period_end,
      true
    );
    
    -- Envoyer notification selon le niveau
    IF v_reminder_level = 1 THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_payment.company_user_id,
        '⏰ Rappel de paiement',
        'Paiement de ' || v_payment.amount || '€ en attente pour ' || v_payment.driver_name,
        'payment_reminder',
        '/company-dashboard?tab=payments'
      );
    ELSIF v_reminder_level = 2 THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_payment.company_user_id,
        '⚠️ Paiement en retard',
        'URGENT: Paiement de ' || v_payment.amount || '€ en retard depuis 3 jours pour ' || v_payment.driver_name,
        'payment_overdue',
        '/company-dashboard?tab=payments'
      );
      
      -- Notifier aussi le chauffeur au niveau 2
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_payment.driver_user_id,
        '⚠️ Paiement en retard',
        'Paiement de ' || v_payment.amount || '€ en retard de ' || v_payment.company_name,
        'payment_overdue',
        '/driver-dashboard?tab=company-payments'
      );
    ELSE
      -- Niveau 3 - critique
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_payment.company_user_id,
        '🚨 Paiement critique',
        'CRITIQUE: Paiement de ' || v_payment.amount || '€ en retard depuis 7+ jours. Action immédiate requise.',
        'payment_critical',
        '/company-dashboard?tab=payments'
      );
      
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_payment.driver_user_id,
        '🚨 Paiement critique en retard',
        'Paiement de ' || v_payment.amount || '€ en retard depuis 7+ jours par ' || v_payment.company_name,
        'payment_critical',
        '/driver-dashboard?tab=company-payments'
      );
    END IF;
  END LOOP;
END;
$$;
