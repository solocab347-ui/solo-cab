-- ========== SYSTÈME AUTOMATIQUE DE NOTIFICATIONS ==========
-- Créer automatiquement des notifications dans la base de données pour tous les événements importants

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_link TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link, is_read)
  VALUES (p_user_id, p_title, p_message, p_type, p_link, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== TRIGGER 1: Notification quand une nouvelle course est créée ==========
-- Notifier le(s) driver(s) quand un client crée une course
CREATE OR REPLACE FUNCTION notify_driver_new_course()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
  v_driver_id UUID;
BEGIN
  -- Si une course est nouvellement créée avec status 'pending'
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    
    -- Récupérer le nom du client
    SELECT full_name INTO v_client_name
    FROM profiles
    WHERE id = (SELECT user_id FROM clients WHERE id = NEW.client_id);
    
    -- Si driver_id est défini, notifier ce driver
    IF NEW.driver_id IS NOT NULL THEN
      SELECT user_id INTO v_driver_user_id
      FROM drivers
      WHERE id = NEW.driver_id;
      
      IF v_driver_user_id IS NOT NULL THEN
        PERFORM create_notification(
          v_driver_user_id,
          '🚗 Nouvelle demande de course',
          v_client_name || ' a créé une demande de course pour le ' || 
          to_char(NEW.scheduled_date::timestamp, 'DD/MM/YYYY à HH24:MI'),
          'course',
          '/driver-dashboard'
        );
      END IF;
    END IF;
    
    -- Si driver_ids array est défini, notifier tous ces drivers
    IF NEW.driver_ids IS NOT NULL AND array_length(NEW.driver_ids, 1) > 0 THEN
      FOR v_driver_id IN SELECT unnest(NEW.driver_ids)
      LOOP
        SELECT user_id INTO v_driver_user_id
        FROM drivers
        WHERE id = v_driver_id;
        
        IF v_driver_user_id IS NOT NULL THEN
          PERFORM create_notification(
            v_driver_user_id,
            '🚗 Nouvelle demande de course',
            v_client_name || ' a créé une demande de course pour le ' || 
            to_char(NEW.scheduled_date::timestamp, 'DD/MM/YYYY à HH24:MI'),
            'course',
            '/driver-dashboard'
          );
        END IF;
      END LOOP;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_driver_new_course ON courses;
CREATE TRIGGER trigger_notify_driver_new_course
AFTER INSERT ON courses
FOR EACH ROW
EXECUTE FUNCTION notify_driver_new_course();

-- ========== TRIGGER 2: Notification quand un devis est créé ==========
-- Notifier le client quand un driver crée un devis
CREATE OR REPLACE FUNCTION notify_client_new_devis()
RETURNS TRIGGER AS $$
DECLARE
  v_client_user_id UUID;
  v_driver_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Récupérer le user_id du client
    SELECT user_id INTO v_client_user_id
    FROM clients
    WHERE id = NEW.client_id;
    
    -- Récupérer le nom du driver
    SELECT COALESCE(p.full_name, d.company_name, 'Votre chauffeur') INTO v_driver_name
    FROM drivers d
    LEFT JOIN profiles p ON d.user_id = p.id
    WHERE d.id = NEW.driver_id;
    
    IF v_client_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_client_user_id,
        '💶 Nouveau devis reçu',
        v_driver_name || ' vous a envoyé un devis de ' || NEW.amount::TEXT || '€',
        'payment',
        '/client-dashboard'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_client_new_devis ON devis;
CREATE TRIGGER trigger_notify_client_new_devis
AFTER INSERT ON devis
FOR EACH ROW
EXECUTE FUNCTION notify_client_new_devis();

-- ========== TRIGGER 3: Notification quand un devis est accepté ==========
-- Notifier le driver quand un client accepte un devis
CREATE OR REPLACE FUNCTION notify_driver_devis_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted') THEN
    -- Récupérer le user_id du driver
    SELECT user_id INTO v_driver_user_id
    FROM drivers
    WHERE id = NEW.driver_id;
    
    -- Récupérer le nom du client
    SELECT full_name INTO v_client_name
    FROM profiles
    WHERE id = (SELECT user_id FROM clients WHERE id = NEW.client_id);
    
    IF v_driver_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_driver_user_id,
        '✅ Devis accepté',
        v_client_name || ' a accepté votre devis de ' || NEW.amount::TEXT || '€',
        'success',
        '/driver-dashboard'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_driver_devis_accepted ON devis;
CREATE TRIGGER trigger_notify_driver_devis_accepted
AFTER UPDATE OF status ON devis
FOR EACH ROW
EXECUTE FUNCTION notify_driver_devis_accepted();

-- ========== TRIGGER 4: Notification quand une course est acceptée ==========
-- Notifier le client quand le driver accepte une course
CREATE OR REPLACE FUNCTION notify_course_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_client_user_id UUID;
  v_driver_name TEXT;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted') THEN
    -- Récupérer le user_id du client
    SELECT user_id INTO v_client_user_id
    FROM clients
    WHERE id = NEW.client_id;
    
    -- Récupérer le nom du driver
    SELECT COALESCE(p.full_name, d.company_name, 'Votre chauffeur') INTO v_driver_name
    FROM drivers d
    LEFT JOIN profiles p ON d.user_id = p.id
    WHERE d.id = NEW.driver_id;
    
    IF v_client_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_client_user_id,
        '✅ Course acceptée',
        v_driver_name || ' a accepté votre demande de course',
        'success',
        '/client-dashboard'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_course_accepted ON courses;
CREATE TRIGGER trigger_notify_course_accepted
AFTER UPDATE OF status ON courses
FOR EACH ROW
EXECUTE FUNCTION notify_course_accepted();

-- ========== TRIGGER 5: Notification quand une course est terminée ==========
-- Notifier le client quand une course est terminée
CREATE OR REPLACE FUNCTION notify_course_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_client_user_id UUID;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed') THEN
    -- Récupérer le user_id du client
    SELECT user_id INTO v_client_user_id
    FROM clients
    WHERE id = NEW.client_id;
    
    IF v_client_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_client_user_id,
        '🏁 Course terminée',
        'Votre course est terminée. Merci d''avoir utilisé SoloCab !',
        'success',
        '/client-dashboard'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_course_completed ON courses;
CREATE TRIGGER trigger_notify_course_completed
AFTER UPDATE OF status ON courses
FOR EACH ROW
EXECUTE FUNCTION notify_course_completed();

-- ========== TRIGGER 6: Notification pour nouveaux messages ==========
-- Notifier le destinataire quand il reçoit un nouveau message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_conversation_participant_1 UUID;
  v_conversation_participant_2 UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Récupérer les participants de la conversation
    SELECT participant_1_id, participant_2_id INTO v_conversation_participant_1, v_conversation_participant_2
    FROM conversations
    WHERE id = NEW.conversation_id;
    
    -- Déterminer le destinataire (celui qui n'est pas l'expéditeur)
    IF NEW.sender_id = v_conversation_participant_1 THEN
      v_recipient_id := v_conversation_participant_2;
    ELSE
      v_recipient_id := v_conversation_participant_1;
    END IF;
    
    -- Récupérer le nom de l'expéditeur
    SELECT full_name INTO v_sender_name
    FROM profiles
    WHERE id = NEW.sender_id;
    
    IF v_recipient_id IS NOT NULL THEN
      PERFORM create_notification(
        v_recipient_id,
        '💬 Nouveau message',
        v_sender_name || ' vous a envoyé un message',
        'message',
        '/messaging'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();