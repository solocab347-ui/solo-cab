-- =====================================================
-- SYSTÈME COMPLET DE FACTURATION ENTREPRISE-CHAUFFEUR
-- =====================================================

-- 1. Table pour tracker les relances envoyées
CREATE TABLE IF NOT EXISTS public.company_payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.company_driver_agreements(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  reminder_level INTEGER NOT NULL DEFAULT 1, -- 1=J+1, 2=J+3, 3=J+7
  amount_due NUMERIC NOT NULL,
  period_start DATE,
  period_end DATE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_sent BOOLEAN DEFAULT false,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company can view their reminders"
ON public.company_payment_reminders FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  OR public.is_company_admin(auth.uid(), company_id)
);

CREATE POLICY "Driver can view reminders sent to them"
ON public.company_payment_reminders FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.drivers WHERE id = driver_id AND user_id = auth.uid())
);

-- Index pour performances
CREATE INDEX idx_company_payment_reminders_agreement ON public.company_payment_reminders(agreement_id);
CREATE INDEX idx_company_payment_reminders_sent_at ON public.company_payment_reminders(sent_at);

-- 2. Fonction pour notifier le chauffeur quand une course entreprise est terminée
CREATE OR REPLACE FUNCTION public.notify_company_course_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement RECORD;
  v_company RECORD;
  v_driver RECORD;
  v_course_amount NUMERIC;
  v_facture_id UUID;
BEGIN
  -- Seulement quand le statut passe à 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Vérifier si c'est une course entreprise
    IF NEW.company_id IS NOT NULL THEN
      
      -- Récupérer le contrat actif
      SELECT cda.*, c.company_name, c.contact_email, c.user_id as company_user_id
      INTO v_agreement
      FROM company_driver_agreements cda
      JOIN companies c ON c.id = cda.company_id
      WHERE cda.company_id = NEW.company_id
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
        
        -- Si paiement par course, notifier immédiatement
        IF v_agreement.payment_frequency = 'per_course' THEN
          -- Notifier l'entreprise
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (
            v_agreement.company_user_id,
            '💳 Paiement requis',
            'Course terminée avec ' || v_driver.full_name || '. Montant: ' || COALESCE(v_course_amount, NEW.price) || '€',
            'payment_due',
            '/company-dashboard?tab=payments'
          );
          
          -- Notifier le chauffeur
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (
            v_driver.user_id,
            '✅ Course entreprise terminée',
            'Course pour ' || v_agreement.company_name || ' terminée. Paiement: ' || COALESCE(v_course_amount, NEW.price) || '€',
            'payment',
            '/driver-dashboard?tab=company-payments'
          );
          
          -- Mettre à jour next_payment_due si null
          UPDATE company_driver_agreements
          SET next_payment_due = NOW() + INTERVAL '3 days'
          WHERE id = v_agreement.id AND next_payment_due IS NULL;
        ELSE
          -- Pour weekly/monthly, juste notifier que la course est ajoutée au récap
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (
            v_driver.user_id,
            '📋 Course ajoutée au récap',
            'Course pour ' || v_agreement.company_name || ' ajoutée à votre prochain paiement ' || 
            CASE v_agreement.payment_frequency 
              WHEN 'weekly' THEN 'hebdomadaire'
              WHEN 'monthly' THEN 'mensuel'
              ELSE ''
            END,
            'payment',
            '/driver-dashboard?tab=company-payments'
          );
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur courses
DROP TRIGGER IF EXISTS trigger_notify_company_course_completed ON public.courses;
CREATE TRIGGER trigger_notify_company_course_completed
  AFTER UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_company_course_completed();

-- 3. Fonction pour générer les récapitulatifs périodiques (weekly/monthly)
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
    -- Calculer la période
    IF v_agreement.payment_frequency = 'weekly' THEN
      v_period_start := date_trunc('week', NOW())::DATE;
      v_period_end := (date_trunc('week', NOW()) + INTERVAL '6 days')::DATE;
      
      -- Vérifier si c'est la fin de la semaine (dimanche)
      IF EXTRACT(DOW FROM NOW()) != 0 THEN
        CONTINUE; -- Pas encore fin de semaine
      END IF;
    ELSE -- monthly
      v_period_start := date_trunc('month', NOW())::DATE;
      v_period_end := (date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      
      -- Vérifier si c'est la fin du mois (dernier jour ou jour de paiement configuré)
      IF EXTRACT(DAY FROM NOW()) != COALESCE(v_agreement.payment_day, EXTRACT(DAY FROM v_period_end)) THEN
        CONTINUE;
      END IF;
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
    
    -- Calculer le total des factures impayées pour cette période
    SELECT 
      COALESCE(SUM(f.amount), 0),
      COUNT(f.id),
      ARRAY_AGG(f.course_id)
    INTO v_total_amount, v_course_count, v_course_ids
    FROM factures f
    JOIN courses co ON co.id = f.course_id
    WHERE f.company_id = v_agreement.company_id
      AND f.driver_id = v_agreement.driver_id
      AND f.payment_status != 'paid'
      AND co.scheduled_date BETWEEN v_period_start AND v_period_end;
    
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
        v_agreement.payment_methods[1],
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
        v_course_count || ' courses avec ' || v_agreement.driver_name || '. Total: ' || v_total_amount || '€. Paiement requis.',
        'payment_due',
        '/company-dashboard?tab=payments'
      );
      
      -- Notifier le chauffeur
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_agreement.driver_user_id,
        '📊 Paiement en attente',
        'Récap ' || 
        CASE v_agreement.payment_frequency 
          WHEN 'weekly' THEN 'hebdomadaire'
          WHEN 'monthly' THEN 'mensuel'
        END || 
        ' de ' || v_agreement.company_name || ': ' || v_total_amount || '€ pour ' || v_course_count || ' courses',
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

-- 4. Fonction de relance graduée
CREATE OR REPLACE FUNCTION public.send_graduated_payment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overdue RECORD;
  v_days_overdue INTEGER;
  v_reminder_level INTEGER;
  v_last_reminder_level INTEGER;
BEGIN
  -- Parcourir les paiements en retard
  FOR v_overdue IN
    SELECT 
      cda.*,
      c.company_name,
      c.user_id as company_user_id,
      c.contact_email as company_email,
      d.user_id as driver_user_id,
      p.full_name as driver_name,
      p.email as driver_email,
      EXTRACT(DAY FROM NOW() - cda.next_payment_due) as days_overdue
    FROM company_driver_agreements cda
    JOIN companies c ON c.id = cda.company_id
    JOIN drivers d ON d.id = cda.driver_id
    JOIN profiles p ON p.id = d.user_id
    WHERE cda.status = 'accepted'
      AND cda.next_payment_due IS NOT NULL
      AND cda.next_payment_due < NOW()
      AND cda.outstanding_balance > 0
  LOOP
    v_days_overdue := GREATEST(0, v_overdue.days_overdue);
    
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
    
    -- Vérifier si une relance de ce niveau a déjà été envoyée
    SELECT MAX(reminder_level) INTO v_last_reminder_level
    FROM company_payment_reminders
    WHERE agreement_id = v_overdue.id
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
      notification_sent
    ) VALUES (
      v_overdue.id,
      v_overdue.company_id,
      v_overdue.driver_id,
      v_reminder_level,
      v_overdue.outstanding_balance,
      true
    );
    
    -- Envoyer notification à l'entreprise selon le niveau
    IF v_reminder_level = 1 THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_overdue.company_user_id,
        '⏰ Rappel de paiement (J+1)',
        'Paiement de ' || v_overdue.outstanding_balance || '€ en attente pour ' || v_overdue.driver_name,
        'payment_reminder',
        '/company-dashboard?tab=payments'
      );
    ELSIF v_reminder_level = 2 THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_overdue.company_user_id,
        '⚠️ Paiement en retard (J+3)',
        'URGENT: Paiement de ' || v_overdue.outstanding_balance || '€ en retard pour ' || v_overdue.driver_name,
        'payment_overdue',
        '/company-dashboard?tab=payments'
      );
    ELSE
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_overdue.company_user_id,
        '🚨 Paiement critique (J+7)',
        'CRITIQUE: Paiement de ' || v_overdue.outstanding_balance || '€ en retard depuis 7 jours. Action immédiate requise.',
        'payment_critical',
        '/company-dashboard?tab=payments'
      );
      
      -- Notifier aussi le chauffeur au niveau 3
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        v_overdue.driver_user_id,
        '⚠️ Paiement critique en retard',
        'Paiement de ' || v_overdue.outstanding_balance || '€ en retard depuis 7 jours par ' || v_overdue.company_name,
        'payment_overdue',
        '/driver-dashboard?tab=company-payments'
      );
    END IF;
  END LOOP;
END;
$$;

-- 5. Mettre à jour la fonction de confirmation de paiement reçu
CREATE OR REPLACE FUNCTION public.update_agreement_on_payment_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement RECORD;
  v_company RECORD;
BEGIN
  -- Seulement quand le status passe à 'received'
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    
    -- Récupérer les infos de l'accord
    SELECT * INTO v_agreement
    FROM company_driver_agreements
    WHERE id = NEW.agreement_id;
    
    -- Mettre à jour les soldes de l'accord
    UPDATE company_driver_agreements
    SET 
      total_paid = COALESCE(total_paid, 0) + NEW.amount,
      outstanding_balance = GREATEST(0, COALESCE(outstanding_balance, 0) - NEW.amount),
      last_payment_date = NOW(),
      next_payment_due = CASE 
        WHEN payment_frequency = 'weekly' THEN NOW() + INTERVAL '7 days'
        WHEN payment_frequency = 'monthly' THEN NOW() + INTERVAL '1 month'
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE id = NEW.agreement_id;

    -- Marquer les factures comme payées
    IF NEW.course_ids IS NOT NULL AND array_length(NEW.course_ids, 1) > 0 THEN
      UPDATE factures
      SET payment_status = 'paid', paid_at = NOW()
      WHERE course_id = ANY(NEW.course_ids);
    END IF;

    -- Récupérer les infos de l'entreprise
    SELECT * INTO v_company FROM companies WHERE id = NEW.company_id;

    -- Notifier le chauffeur que le paiement a été reçu
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT 
      d.user_id,
      '✅ Paiement confirmé',
      'Paiement de ' || NEW.amount || '€ reçu de ' || v_company.company_name || '. Merci !',
      'payment',
      '/driver-dashboard?tab=company-payments'
    FROM drivers d
    WHERE d.id = NEW.driver_id;
    
    -- Notifier l'entreprise de la confirmation
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_company.user_id,
      '✅ Paiement validé',
      'Le chauffeur a confirmé la réception de ' || NEW.amount || '€',
      'payment',
      '/company-dashboard?tab=payments'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS trigger_update_agreement_on_payment_received ON public.company_payments;
CREATE TRIGGER trigger_update_agreement_on_payment_received
  AFTER UPDATE ON public.company_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agreement_on_payment_received();