-- ========== SÉCURISATION DES VUES ==========
-- Retirer l'accès public aux vues matérialisées exposant des données sensibles

-- 1. Retirer accès public à driver_statistics (contient revenus et statistiques business)
REVOKE SELECT ON driver_statistics FROM anon, authenticated;

-- 2. Retirer accès public à driver_data_isolation (contient données d'isolation)
REVOKE SELECT ON driver_data_isolation FROM anon, authenticated;

-- 3. Créer fonction sécurisée pour les drivers - voir leurs propres statistiques uniquement
CREATE OR REPLACE FUNCTION get_my_driver_statistics()
RETURNS SETOF driver_statistics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _driver_id UUID;
BEGIN
  -- Récupérer le driver_id de l'utilisateur connecté
  SELECT id INTO _driver_id
  FROM drivers
  WHERE user_id = auth.uid();
  
  IF _driver_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Retourner uniquement les statistiques du driver connecté
  RETURN QUERY
  SELECT * FROM driver_statistics
  WHERE driver_id = _driver_id;
END;
$$;

-- 4. Donner accès à la fonction aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION get_my_driver_statistics() TO authenticated;

-- 5. Créer fonction sécurisée pour les admins - voir toutes les statistiques
CREATE OR REPLACE FUNCTION admin_get_all_driver_statistics()
RETURNS SETOF driver_statistics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'utilisateur est admin
  IF NOT (SELECT has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Accès non autorisé - Réservé aux administrateurs';
  END IF;
  
  -- Retourner toutes les statistiques pour les admins
  RETURN QUERY
  SELECT * FROM driver_statistics;
END;
$$;

-- 6. Donner accès à la fonction admin
GRANT EXECUTE ON FUNCTION admin_get_all_driver_statistics() TO authenticated;

-- ========== TRIGGERS EMAILS POUR CHAUFFEURS ==========
-- Modifier les triggers existants pour appeler les Edge Functions d'email

-- 1. Trigger modifié : Email au chauffeur quand un client s'inscrit (géré dans les Edge Functions register-client-qr et register-client-driver)

-- 2. Trigger modifié : Email au chauffeur pour nouvelle demande de course
CREATE OR REPLACE FUNCTION notify_driver_new_course_with_email()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
  v_driver_id UUID;
  v_course_date TEXT;
BEGIN
  -- Si une course est nouvellement créée avec status 'pending'
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
    
    -- Récupérer le nom du client
    SELECT full_name INTO v_client_name
    FROM profiles
    WHERE id = (SELECT user_id FROM clients WHERE id = NEW.client_id);
    
    -- Formater la date de la course
    v_course_date := to_char(NEW.scheduled_date::timestamp, 'DD/MM/YYYY à HH24:MI');
    
    -- Si driver_id est défini, notifier ce driver
    IF NEW.driver_id IS NOT NULL THEN
      SELECT user_id INTO v_driver_user_id
      FROM drivers
      WHERE id = NEW.driver_id;
      
      IF v_driver_user_id IS NOT NULL THEN
        -- Notification dans l'app
        PERFORM create_notification(
          v_driver_user_id,
          '🚗 Nouvelle demande de course',
          v_client_name || ' a créé une demande de course pour le ' || v_course_date,
          'course',
          '/driver-dashboard'
        );
        
        -- Email au chauffeur (asynchrone, ne bloque pas)
        PERFORM
          net.http_post(
            url := current_setting('app.settings.supabase_url') || '/functions/v1/send-driver-course-request',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
            ),
            body := jsonb_build_object(
              'driver_id', NEW.driver_id,
              'client_name', v_client_name,
              'course_date', v_course_date,
              'pickup_address', NEW.pickup_address,
              'destination_address', NEW.destination_address
            )
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
          -- Notification dans l'app
          PERFORM create_notification(
            v_driver_user_id,
            '🚗 Nouvelle demande de course',
            v_client_name || ' a créé une demande de course pour le ' || v_course_date,
            'course',
            '/driver-dashboard'
          );
          
          -- Email au chauffeur (asynchrone)
          PERFORM
            net.http_post(
              url := current_setting('app.settings.supabase_url') || '/functions/v1/send-driver-course-request',
              headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
              ),
              body := jsonb_build_object(
                'driver_id', v_driver_id,
                'client_name', v_client_name,
                'course_date', v_course_date,
                'pickup_address', NEW.pickup_address,
                'destination_address', NEW.destination_address
              )
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
EXECUTE FUNCTION notify_driver_new_course_with_email();

-- 3. Trigger modifié : Email au chauffeur quand devis est accepté
CREATE OR REPLACE FUNCTION notify_driver_devis_accepted_with_email()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_user_id UUID;
  v_client_name TEXT;
  v_course_date TEXT;
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
    
    -- Récupérer la date de la course
    SELECT to_char(scheduled_date::timestamp, 'DD/MM/YYYY à HH24:MI') INTO v_course_date
    FROM courses
    WHERE id = NEW.course_id;
    
    IF v_driver_user_id IS NOT NULL THEN
      -- Notification dans l'app
      PERFORM create_notification(
        v_driver_user_id,
        '✅ Devis accepté',
        v_client_name || ' a accepté votre devis de ' || NEW.amount::TEXT || '€',
        'success',
        '/driver-dashboard'
      );
      
      -- Email au chauffeur (asynchrone)
      PERFORM
        net.http_post(
          url := current_setting('app.settings.supabase_url') || '/functions/v1/send-driver-devis-accepted',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
          ),
          body := jsonb_build_object(
            'driver_id', NEW.driver_id,
            'client_name', v_client_name,
            'devis_amount', NEW.amount,
            'course_date', v_course_date
          )
        );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_driver_devis_accepted ON devis;
CREATE TRIGGER trigger_notify_driver_devis_accepted
AFTER UPDATE ON devis
FOR EACH ROW
EXECUTE FUNCTION notify_driver_devis_accepted_with_email();
