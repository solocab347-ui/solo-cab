-- NETTOYAGE DES TRIGGERS DE NOTIFICATION EN DOUBLE
-- Ce script unifie les notifications pour éviter les doublons

-- ========================================
-- 1. SUPPRESSION DES ANCIENS TRIGGERS DUPLIQUÉS
-- ========================================

-- Suppression des anciens triggers sur courses
DROP TRIGGER IF EXISTS trigger_notify_new_course ON courses;
DROP TRIGGER IF EXISTS trigger_notify_driver_new_course ON courses;
DROP TRIGGER IF EXISTS trigger_notify_course_accepted ON courses;
DROP TRIGGER IF EXISTS trigger_notify_course_completed ON courses;

-- Suppression des anciens triggers sur devis
DROP TRIGGER IF EXISTS trigger_notify_new_devis ON devis;
DROP TRIGGER IF EXISTS trigger_notify_client_new_devis ON devis;
DROP TRIGGER IF EXISTS trigger_notify_driver_devis_accepted ON devis;
DROP TRIGGER IF EXISTS trigger_notify_devis_accepted_with_email ON devis;

-- Suppression des anciens triggers sur factures
DROP TRIGGER IF EXISTS trigger_notify_new_facture ON factures;

-- ========================================
-- 2. FONCTIONS UNIFIÉES DE NOTIFICATION
-- ========================================

-- Fonction unifiée pour les notifications de nouvelle course
CREATE OR REPLACE FUNCTION public.unified_notify_new_course()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_user_id UUID;
  v_client_name TEXT;
  v_driver_name TEXT;
BEGIN
  -- Ne pas notifier si la course est créée par un guest (pas de client_id)
  IF NEW.client_id IS NULL AND NEW.is_guest_booking = true THEN
    RETURN NEW;
  END IF;

  -- Récupérer les user_id
  SELECT user_id INTO v_driver_user_id FROM drivers WHERE id = NEW.driver_id;
  
  IF NEW.client_id IS NOT NULL THEN
    SELECT user_id INTO v_client_user_id FROM clients WHERE id = NEW.client_id;
    SELECT full_name INTO v_client_name FROM profiles WHERE id = v_client_user_id;
  END IF;
  
  SELECT COALESCE(p.full_name, d.company_name) INTO v_driver_name 
  FROM drivers d LEFT JOIN profiles p ON d.user_id = p.id WHERE d.id = NEW.driver_id;
  
  -- Déterminer qui a créé la course pour notifier l'autre partie
  IF NEW.created_by_user_id = v_client_user_id THEN
    -- Client a créé, notifier le chauffeur
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_driver_user_id, '🚗 Nouvelle demande de course', 
            COALESCE(v_client_name, 'Un client') || ' souhaite réserver une course',
            'course_request', '/driver-dashboard?tab=courses');
  ELSIF NEW.created_by_user_id = v_driver_user_id THEN
    -- Chauffeur a créé, notifier le client
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_client_user_id, '📋 Nouveau devis disponible', 
              v_driver_name || ' vous a envoyé un devis',
              'devis_created', '/client-dashboard?tab=finances&subtab=devis');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fonction unifiée pour les notifications de changement de statut de course
CREATE OR REPLACE FUNCTION public.unified_notify_course_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_user_id UUID;
  v_client_name TEXT;
  v_driver_name TEXT;
BEGIN
  -- Ne notifier que sur changement de statut
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Récupérer les user_id
  SELECT user_id INTO v_driver_user_id FROM drivers WHERE id = NEW.driver_id;
  IF NEW.client_id IS NOT NULL THEN
    SELECT user_id INTO v_client_user_id FROM clients WHERE id = NEW.client_id;
    SELECT full_name INTO v_client_name FROM profiles WHERE id = v_client_user_id;
  END IF;
  SELECT COALESCE(p.full_name, d.company_name) INTO v_driver_name 
  FROM drivers d LEFT JOIN profiles p ON d.user_id = p.id WHERE d.id = NEW.driver_id;

  -- Course acceptée
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_client_user_id, '✅ Course confirmée', 
              v_driver_name || ' a confirmé votre course',
              'success', '/client-dashboard?tab=courses');
    END IF;
  END IF;

  -- Course en cours
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_client_user_id, '🚕 Course en cours', 
              v_driver_name || ' est en route',
              'info', '/client-dashboard');
    END IF;
  END IF;

  -- Course terminée
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Notifier le client
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_client_user_id, '🏁 Course terminée', 
              'Votre course est terminée. Merci !',
              'success', '/client-dashboard');
    END IF;
  END IF;

  -- Course annulée
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_client_user_id, '❌ Course annulée', 
              'Votre course a été annulée',
              'warning', '/client-dashboard');
    END IF;
    IF v_driver_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_driver_user_id, '❌ Course annulée', 
              'Une course a été annulée',
              'warning', '/driver-dashboard?tab=courses');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fonction unifiée pour les notifications de devis accepté/refusé
CREATE OR REPLACE FUNCTION public.unified_notify_devis_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
BEGIN
  -- Ne notifier que sur changement de statut
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_driver_user_id FROM drivers WHERE id = NEW.driver_id;
  SELECT full_name INTO v_client_name FROM profiles p 
    JOIN clients c ON c.user_id = p.id WHERE c.id = NEW.client_id;

  -- Devis accepté
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_driver_user_id, '✅ Devis accepté', 
            COALESCE(v_client_name, 'Le client') || ' a accepté le devis ' || COALESCE(NEW.quote_number, ''),
            'success', '/driver-dashboard?tab=courses');
  END IF;

  -- Devis refusé
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_driver_user_id, '❌ Devis refusé', 
            COALESCE(v_client_name, 'Le client') || ' a refusé le devis ' || COALESCE(NEW.quote_number, ''),
            'warning', '/driver-dashboard?tab=devis');
  END IF;

  RETURN NEW;
END;
$function$;

-- Fonction unifiée pour les notifications de nouvelle facture
CREATE OR REPLACE FUNCTION public.unified_notify_new_facture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_client_user_id UUID;
  v_driver_name TEXT;
BEGIN
  SELECT user_id INTO v_client_user_id FROM clients WHERE id = NEW.client_id;
  SELECT COALESCE(p.full_name, d.company_name) INTO v_driver_name 
  FROM drivers d LEFT JOIN profiles p ON d.user_id = p.id WHERE d.id = NEW.driver_id;

  -- Une seule notification pour la facture
  IF v_client_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_client_user_id, '🧾 Facture disponible', 
            'Votre facture ' || COALESCE(NEW.invoice_number, '') || ' de ' || NEW.amount || '€ est disponible',
            'facture_generated', '/client-dashboard?tab=finances&subtab=factures');
  END IF;

  RETURN NEW;
END;
$function$;

-- ========================================
-- 3. CRÉATION DES NOUVEAUX TRIGGERS UNIFIÉS
-- ========================================

-- Trigger unifié pour nouvelle course
CREATE TRIGGER trigger_unified_notify_new_course
AFTER INSERT ON courses
FOR EACH ROW
EXECUTE FUNCTION unified_notify_new_course();

-- Trigger unifié pour changement de statut de course
CREATE TRIGGER trigger_unified_notify_course_status
AFTER UPDATE OF status ON courses
FOR EACH ROW
EXECUTE FUNCTION unified_notify_course_status_change();

-- Trigger unifié pour changement de statut de devis
CREATE TRIGGER trigger_unified_notify_devis_status
AFTER UPDATE OF status ON devis
FOR EACH ROW
EXECUTE FUNCTION unified_notify_devis_status_change();

-- Trigger unifié pour nouvelle facture
CREATE TRIGGER trigger_unified_notify_facture
AFTER INSERT ON factures
FOR EACH ROW
EXECUTE FUNCTION unified_notify_new_facture();

-- ========================================
-- 4. SUPPRESSION DES ANCIENNES FONCTIONS
-- ========================================

DROP FUNCTION IF EXISTS notify_new_course() CASCADE;
DROP FUNCTION IF EXISTS notify_driver_new_course() CASCADE;
DROP FUNCTION IF EXISTS notify_client_new_devis() CASCADE;
DROP FUNCTION IF EXISTS notify_driver_devis_accepted() CASCADE;
DROP FUNCTION IF EXISTS notify_course_accepted() CASCADE;
DROP FUNCTION IF EXISTS notify_course_completed() CASCADE;
DROP FUNCTION IF EXISTS notify_new_facture() CASCADE;