-- CORRECTIF: Modifier le trigger pour notifier les chauffeurs même pour les courses guest (non inscrits)

CREATE OR REPLACE FUNCTION public.unified_notify_new_course()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_user_id UUID;
  v_client_user_id UUID;
  v_client_name TEXT;
  v_driver_name TEXT;
  v_guest_name TEXT;
BEGIN
  -- Get driver user_id
  SELECT user_id INTO v_driver_user_id FROM drivers WHERE id = NEW.driver_id;
  
  -- Pour les courses guest (non inscrit), on notifie quand même le chauffeur
  IF NEW.client_id IS NULL AND NEW.is_guest_booking = true THEN
    -- Récupérer le nom du guest depuis la course
    v_guest_name := COALESCE(NEW.guest_name, 'Client non inscrit');
    
    -- Notification au chauffeur pour la nouvelle course guest
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      v_driver_user_id, 
      '🚗 Nouvelle réservation (non inscrit)', 
      v_guest_name || ' a demandé une course via votre profil',
      'course_request', 
      '/driver-dashboard?tab=courses'
    );
    
    RETURN NEW;
  END IF;
  
  -- Pour les clients inscrits, logique existante
  IF NEW.client_id IS NOT NULL THEN
    SELECT user_id INTO v_client_user_id FROM clients WHERE id = NEW.client_id;
    SELECT full_name INTO v_client_name FROM profiles WHERE id = v_client_user_id;
  END IF;
  
  SELECT COALESCE(p.full_name, d.company_name) INTO v_driver_name 
  FROM drivers d LEFT JOIN profiles p ON d.user_id = p.id WHERE d.id = NEW.driver_id;
  
  -- Client a créé la course → notifier le chauffeur
  IF NEW.created_by_user_id = v_client_user_id THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_driver_user_id, '🚗 Nouvelle demande de course', 
            COALESCE(v_client_name, 'Un client') || ' souhaite réserver une course',
            'course_request', '/driver-dashboard?tab=courses');
  -- Chauffeur a créé la course → notifier le client
  ELSIF NEW.created_by_user_id = v_driver_user_id THEN
    IF v_client_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (v_client_user_id, '📋 Nouveau devis disponible', 
              v_driver_name || ' vous a envoyé un devis',
              'devis_created', '/client-dashboard?tab=finances&subtab=devis');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;