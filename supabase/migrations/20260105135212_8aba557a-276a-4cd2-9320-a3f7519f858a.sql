
-- 1. Allow client_id to be NULL in factures when company_id is set
ALTER TABLE public.factures ALTER COLUMN client_id DROP NOT NULL;

-- 2. Add constraint: client_id OR company_id must be set
ALTER TABLE public.factures ADD CONSTRAINT factures_client_or_company_check 
CHECK (client_id IS NOT NULL OR company_id IS NOT NULL);

-- 3. Allow client_id to be NULL in devis when company_id is set  
ALTER TABLE public.devis ALTER COLUMN client_id DROP NOT NULL;

-- 4. Add constraint: client_id OR company_id must be set for devis
ALTER TABLE public.devis ADD CONSTRAINT devis_client_or_company_check 
CHECK (client_id IS NOT NULL OR company_id IS NOT NULL);

-- 5. Create function for company payment reminders
CREATE OR REPLACE FUNCTION public.check_company_payment_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  overdue_payment RECORD;
BEGIN
  -- Find payments that are overdue (agreement has next_payment_due in the past)
  FOR overdue_payment IN
    SELECT 
      cda.id as agreement_id,
      cda.company_id,
      cda.driver_id,
      cda.next_payment_due,
      cda.outstanding_balance,
      c.user_id as company_user_id,
      c.company_name,
      p.full_name as driver_name
    FROM company_driver_agreements cda
    JOIN companies c ON c.id = cda.company_id
    JOIN drivers d ON d.id = cda.driver_id
    JOIN profiles p ON p.id = d.user_id
    WHERE cda.status = 'accepted'
      AND cda.next_payment_due < NOW()
      AND cda.outstanding_balance > 0
      AND NOT EXISTS (
        -- Check if we already sent a reminder in the last 3 days
        SELECT 1 FROM notifications n 
        WHERE n.user_id = c.user_id 
          AND n.type = 'payment_reminder'
          AND n.created_at > NOW() - INTERVAL '3 days'
          AND n.link LIKE '%' || cda.driver_id::text || '%'
      )
  LOOP
    -- Create notification for company
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      overdue_payment.company_user_id,
      '⏰ Rappel de paiement',
      'Un paiement est en retard pour ' || overdue_payment.driver_name || '. Montant: ' || overdue_payment.outstanding_balance || '€',
      'payment_reminder',
      '/company-dashboard?tab=payments&driver=' || overdue_payment.driver_id
    );
  END LOOP;
END;
$$;

-- 6. Create trigger to update agreement balance when facture is created
CREATE OR REPLACE FUNCTION public.update_agreement_balance_on_facture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agreement_record RECORD;
BEGIN
  -- Only process company factures
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find active agreement between company and driver
  SELECT * INTO agreement_record
  FROM company_driver_agreements
  WHERE company_id = NEW.company_id 
    AND driver_id = NEW.driver_id
    AND status = 'accepted'
  LIMIT 1;

  IF agreement_record.id IS NOT NULL THEN
    -- Update total_billed and outstanding_balance
    UPDATE company_driver_agreements
    SET 
      total_billed = COALESCE(total_billed, 0) + NEW.amount,
      outstanding_balance = COALESCE(outstanding_balance, 0) + NEW.amount,
      updated_at = NOW()
    WHERE id = agreement_record.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_agreement_balance_on_facture_insert
AFTER INSERT ON public.factures
FOR EACH ROW
EXECUTE FUNCTION public.update_agreement_balance_on_facture();

-- 7. Create trigger to update agreement when payment is received
CREATE OR REPLACE FUNCTION public.update_agreement_on_payment_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when status changes to 'received'
  IF NEW.status = 'received' AND (OLD.status IS NULL OR OLD.status != 'received') THEN
    -- Update agreement balances
    UPDATE company_driver_agreements
    SET 
      total_paid = COALESCE(total_paid, 0) + NEW.amount,
      outstanding_balance = COALESCE(outstanding_balance, 0) - NEW.amount,
      last_payment_date = NOW(),
      next_payment_due = CASE 
        WHEN payment_frequency = 'weekly' THEN NOW() + INTERVAL '7 days'
        WHEN payment_frequency = 'monthly' THEN NOW() + INTERVAL '1 month'
        ELSE next_payment_due
      END,
      updated_at = NOW()
    WHERE id = NEW.agreement_id;

    -- Mark related factures as paid
    IF NEW.course_ids IS NOT NULL AND array_length(NEW.course_ids, 1) > 0 THEN
      UPDATE factures
      SET payment_status = 'paid', paid_at = NOW()
      WHERE course_id = ANY(NEW.course_ids);
    END IF;

    -- Notify driver that payment was received
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT 
      d.user_id,
      '✅ Paiement reçu',
      'Paiement de ' || NEW.amount || '€ confirmé par ' || c.company_name,
      'payment',
      '/driver-dashboard?tab=courses'
    FROM drivers d
    JOIN companies c ON c.id = NEW.company_id
    WHERE d.id = NEW.driver_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_agreement_on_payment_received_trigger
AFTER UPDATE ON public.company_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_agreement_on_payment_received();
