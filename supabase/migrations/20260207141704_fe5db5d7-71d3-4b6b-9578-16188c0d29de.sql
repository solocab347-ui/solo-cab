-- Fonction pour notifier tous les admins lors d'événements importants
CREATE OR REPLACE FUNCTION notify_all_admins(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'admin',
  p_link TEXT DEFAULT '/admin-dashboard',
  p_category TEXT DEFAULT 'admin'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Insérer une notification pour chaque admin
  FOR admin_user_id IN 
    SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link, category, is_read)
    VALUES (admin_user_id, p_title, p_message, p_type, p_link, p_category, false);
  END LOOP;
END;
$$;

-- Trigger pour notifier l'admin quand un chauffeur soumet ses documents
CREATE OR REPLACE FUNCTION notify_admin_on_documents_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  driver_name TEXT;
  driver_email TEXT;
BEGIN
  -- Seulement si le statut des documents passe à 'submitted'
  IF (OLD.documents_status IS DISTINCT FROM 'submitted') 
     AND NEW.documents_status = 'submitted' THEN
    
    -- Récupérer les infos du chauffeur
    SELECT p.full_name, p.email INTO driver_name, driver_email
    FROM profiles p WHERE p.id = NEW.user_id;
    
    -- Notifier tous les admins
    PERFORM notify_all_admins(
      '📋 Documents soumis - Validation requise',
      'Le chauffeur ' || COALESCE(driver_name, 'Inconnu') || ' (' || COALESCE(driver_email, 'N/A') || ') a soumis ses documents. Action requise.',
      'admin',
      '/admin-dashboard?tab=documents',
      'driver_documents'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_notify_admin_documents_submitted ON drivers;
CREATE TRIGGER trigger_notify_admin_documents_submitted
  AFTER UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_documents_submitted();

-- Trigger pour notifier l'admin quand un nouveau chauffeur s'inscrit (termine l'onboarding)
CREATE OR REPLACE FUNCTION notify_admin_on_driver_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  driver_name TEXT;
  driver_email TEXT;
BEGIN
  -- Récupérer les infos du chauffeur
  SELECT p.full_name, p.email INTO driver_name, driver_email
  FROM profiles p WHERE p.id = NEW.user_id;
  
  -- Notifier tous les admins
  PERFORM notify_all_admins(
    '🚗 Nouveau chauffeur inscrit',
    'Nouveau chauffeur : ' || COALESCE(driver_name, 'Inconnu') || ' (' || COALESCE(driver_email, 'N/A') || '). Vérifiez son dossier.',
    'admin',
    '/admin-dashboard?tab=users',
    'driver_registration'
  );
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour les nouvelles inscriptions
DROP TRIGGER IF EXISTS trigger_notify_admin_driver_created ON drivers;
CREATE TRIGGER trigger_notify_admin_driver_created
  AFTER INSERT ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_driver_created();

-- Trigger pour notifier quand un document de véhicule est soumis
CREATE OR REPLACE FUNCTION notify_admin_on_vehicle_document_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  driver_name TEXT;
  driver_email TEXT;
  vehicle_info TEXT;
BEGIN
  -- Seulement si le statut passe à 'submitted'
  IF (OLD.status IS DISTINCT FROM 'submitted') 
     AND NEW.status = 'submitted' THEN
    
    -- Récupérer les infos du chauffeur via le véhicule
    SELECT p.full_name, p.email, dv.brand || ' ' || dv.model || ' (' || dv.plate || ')'
    INTO driver_name, driver_email, vehicle_info
    FROM driver_vehicles dv
    JOIN drivers d ON d.id = dv.driver_id
    JOIN profiles p ON p.id = d.user_id
    WHERE dv.id = NEW.vehicle_id;
    
    -- Notifier tous les admins
    PERFORM notify_all_admins(
      '📄 Document véhicule soumis',
      'Document "' || NEW.document_type || '" soumis pour ' || COALESCE(vehicle_info, 'véhicule') || ' par ' || COALESCE(driver_name, 'Inconnu') || '.',
      'admin',
      '/admin-dashboard?tab=documents',
      'vehicle_documents'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour les documents véhicule
DROP TRIGGER IF EXISTS trigger_notify_admin_vehicle_doc_submitted ON driver_vehicle_documents;
CREATE TRIGGER trigger_notify_admin_vehicle_doc_submitted
  AFTER UPDATE ON driver_vehicle_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_vehicle_document_submitted();