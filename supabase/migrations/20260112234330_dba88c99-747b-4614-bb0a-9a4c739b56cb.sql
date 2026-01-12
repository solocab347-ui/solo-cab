-- =====================================================
-- SYSTÈME DE NOTIFICATIONS PUSH AUTOMATIQUES
-- Trigger pour envoyer des push notifications via pg_net
-- quand une notification est insérée dans la table
-- =====================================================

-- Créer la fonction qui envoie les push notifications
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Récupérer les variables d'environnement
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Si les variables ne sont pas configurées, utiliser les valeurs par défaut via pg_net
  -- L'edge function sera appelée via une requête HTTP asynchrone
  PERFORM extensions.http_post(
    url := 'https://iyothopplhbwcfrpxryc.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'message', NEW.message,
      'link', COALESCE(NEW.link, '/notifications'),
      'tag', COALESCE(NEW.type, 'info')
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ne pas bloquer l'insertion si le push échoue
    RAISE WARNING 'Push notification error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Créer le trigger sur la table notifications
DROP TRIGGER IF EXISTS on_notification_insert_push ON public.notifications;

CREATE TRIGGER on_notification_insert_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();

-- =====================================================
-- AJOUTER UNE COLONNE POUR TRACKER SI PUSH A ÉTÉ ENVOYÉ
-- =====================================================
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS push_sent_at TIMESTAMPTZ;

-- =====================================================
-- FONCTION POUR CRÉER DES NOTIFICATIONS AVEC PUSH
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_notification_with_push(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT '/notifications',
  p_category TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link, category, is_read)
  VALUES (p_user_id, p_title, p_message, p_type, p_link, p_category, false)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- =====================================================
-- FONCTION BATCH POUR NOTIFIER PLUSIEURS USERS
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_notifications_batch(
  p_user_ids UUID[],
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT '/notifications',
  p_category TEXT DEFAULT NULL
)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
  notification_id UUID;
BEGIN
  FOREACH user_id IN ARRAY p_user_ids
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link, category, is_read)
    VALUES (user_id, p_title, p_message, p_type, p_link, p_category, false)
    RETURNING id INTO notification_id;
    
    RETURN NEXT notification_id;
  END LOOP;
  
  RETURN;
END;
$$;

-- =====================================================
-- NOTIFICATIONS POUR LES DEVIS
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_devis_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_user_id UUID;
  driver_name TEXT;
BEGIN
  -- Récupérer le user_id du client
  SELECT c.user_id INTO client_user_id
  FROM public.clients c
  JOIN public.courses co ON co.client_id = c.id
  WHERE co.id = NEW.course_id;
  
  -- Récupérer le nom du chauffeur
  SELECT COALESCE(p.full_name, d.company_name, 'Votre chauffeur') INTO driver_name
  FROM public.drivers d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  WHERE d.id = NEW.driver_id;
  
  -- Créer la notification
  IF client_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, category)
    VALUES (
      client_user_id,
      '💶 Nouveau devis reçu',
      format('%s vous a envoyé un devis de %s€', driver_name, ROUND(NEW.amount::numeric, 2)),
      'devis',
      '/client-dashboard',
      'devis'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour les devis
DROP TRIGGER IF EXISTS on_devis_created ON public.devis;
CREATE TRIGGER on_devis_created
  AFTER INSERT ON public.devis
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_devis_created();

-- =====================================================
-- NOTIFICATIONS POUR LES FACTURES
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_facture_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_user_id UUID;
  driver_name TEXT;
BEGIN
  -- Récupérer le user_id du client
  SELECT c.user_id INTO client_user_id
  FROM public.clients c
  JOIN public.courses co ON co.id = NEW.course_id
  WHERE co.client_id = c.id;
  
  -- Récupérer le nom du chauffeur
  SELECT COALESCE(p.full_name, d.company_name, 'Votre chauffeur') INTO driver_name
  FROM public.drivers d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  WHERE d.id = NEW.driver_id;
  
  IF client_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link, category)
    VALUES (
      client_user_id,
      '📄 Nouvelle facture',
      format('Facture %s de %s€ par %s', NEW.invoice_number, ROUND(NEW.total_amount::numeric, 2), driver_name),
      'facture',
      '/client-dashboard',
      'facture'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour les factures
DROP TRIGGER IF EXISTS on_facture_created ON public.factures;
CREATE TRIGGER on_facture_created
  AFTER INSERT ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_facture_created();

-- =====================================================
-- NOTIFICATIONS POUR LES DEMANDES DE PARTENARIAT
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_partnership_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  receiver_user_id UUID;
  sender_name TEXT;
  commission_info TEXT;
BEGIN
  -- Récupérer le user_id du destinataire
  SELECT user_id INTO receiver_user_id
  FROM public.drivers
  WHERE id = NEW.receiver_driver_id;
  
  -- Récupérer le nom de l'expéditeur
  SELECT COALESCE(p.full_name, d.company_name, 'Un chauffeur') INTO sender_name
  FROM public.drivers d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  WHERE d.id = NEW.sender_driver_id;
  
  commission_info := NEW.commission_percentage || '%';
  
  INSERT INTO public.notifications (user_id, title, message, type, link, category)
  VALUES (
    receiver_user_id,
    '🤝 Nouvelle demande de partenariat',
    format('%s souhaite devenir votre partenaire (%s de commission)', sender_name, commission_info),
    'partnership',
    '/driver-dashboard?tab=partnerships',
    'partnership'
  );
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour les partenariats
DROP TRIGGER IF EXISTS on_partnership_request ON public.driver_partnerships;
CREATE TRIGGER on_partnership_request
  AFTER INSERT ON public.driver_partnerships
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_partnership_request();

-- =====================================================
-- NOTIFICATIONS POUR LES RÉPONSES AUX PARTENARIATS
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_partnership_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_user_id UUID;
  receiver_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  -- Seulement si le statut a changé
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Récupérer le user_id de l'expéditeur original
  SELECT user_id INTO sender_user_id
  FROM public.drivers
  WHERE id = NEW.sender_driver_id;
  
  -- Récupérer le nom du destinataire
  SELECT COALESCE(p.full_name, d.company_name, 'Le chauffeur') INTO receiver_name
  FROM public.drivers d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  WHERE d.id = NEW.receiver_driver_id;
  
  IF NEW.status = 'accepted' THEN
    notification_title := '✅ Partenariat accepté !';
    notification_message := format('%s a accepté votre demande de partenariat', receiver_name);
    notification_type := 'success';
  ELSIF NEW.status = 'rejected' THEN
    notification_title := '❌ Partenariat refusé';
    notification_message := format('%s a décliné votre demande de partenariat', receiver_name);
    notification_type := 'warning';
  ELSIF NEW.status = 'terminated' THEN
    notification_title := '🚫 Partenariat terminé';
    notification_message := format('%s a mis fin au partenariat', receiver_name);
    notification_type := 'warning';
  ELSE
    RETURN NEW;
  END IF;
  
  INSERT INTO public.notifications (user_id, title, message, type, link, category)
  VALUES (
    sender_user_id,
    notification_title,
    notification_message,
    notification_type,
    '/driver-dashboard?tab=partnerships',
    'partnership'
  );
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour les réponses aux partenariats
DROP TRIGGER IF EXISTS on_partnership_response ON public.driver_partnerships;
CREATE TRIGGER on_partnership_response
  AFTER UPDATE ON public.driver_partnerships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_partnership_response();

-- =====================================================
-- NOTIFICATIONS POUR LES COURSES PARTAGÉES
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_course_shared_to_partner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  partner_user_id UUID;
  sender_name TEXT;
  course_date TEXT;
BEGIN
  -- Récupérer le user_id du partenaire
  SELECT user_id INTO partner_user_id
  FROM public.drivers
  WHERE id = NEW.shared_to_driver_id;
  
  -- Récupérer le nom de l'expéditeur
  SELECT COALESCE(p.full_name, d.company_name, 'Un partenaire') INTO sender_name
  FROM public.drivers d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  WHERE d.id = NEW.shared_by_driver_id;
  
  -- Récupérer la date de la course
  SELECT to_char(c.scheduled_date, 'DD/MM à HH24:MI') INTO course_date
  FROM public.courses c
  WHERE c.id = NEW.course_id;
  
  INSERT INTO public.notifications (user_id, title, message, type, link, category)
  VALUES (
    partner_user_id,
    '📤 Course proposée par un partenaire',
    format('%s vous propose une course le %s', sender_name, course_date),
    'course',
    '/driver-dashboard?tab=partnerships',
    'course_shared'
  );
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour les courses partagées
DROP TRIGGER IF EXISTS on_course_shared ON public.shared_courses;
CREATE TRIGGER on_course_shared
  AFTER INSERT ON public.shared_courses
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_course_shared_to_partner();

-- =====================================================
-- NOTIFICATIONS POUR LES ENTREPRISES - PARTENARIAT ACCEPTÉ/REFUSÉ
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_company_agreement_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  driver_user_id UUID;
  company_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Récupérer le user_id du chauffeur
  SELECT user_id INTO driver_user_id
  FROM public.drivers
  WHERE id = NEW.driver_id;
  
  -- Récupérer le nom de l'entreprise
  SELECT c.company_name INTO company_name
  FROM public.companies c
  WHERE c.id = NEW.company_id;
  
  IF NEW.status = 'accepted' OR (NEW.company_signed = true AND NEW.driver_signed = true) THEN
    notification_title := '✅ Partenariat entreprise confirmé';
    notification_message := format('%s a confirmé le partenariat', company_name);
    notification_type := 'success';
  ELSIF NEW.status = 'rejected' THEN
    notification_title := '❌ Partenariat entreprise refusé';
    notification_message := format('%s a décliné votre proposition', company_name);
    notification_type := 'warning';
  ELSIF NEW.status = 'terminated' THEN
    notification_title := '🚫 Partenariat terminé';
    notification_message := format('%s a mis fin au partenariat', company_name);
    notification_type := 'warning';
  ELSE
    RETURN NEW;
  END IF;
  
  INSERT INTO public.notifications (user_id, title, message, type, link, category)
  VALUES (
    driver_user_id,
    notification_title,
    notification_message,
    notification_type,
    '/driver-dashboard?tab=companies',
    'company_partnership'
  );
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_company_agreement_response ON public.company_driver_agreements;
CREATE TRIGGER on_company_agreement_response
  AFTER UPDATE ON public.company_driver_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_company_agreement_response();

-- =====================================================
-- NOTIFICATIONS POUR LES GESTIONNAIRES DE FLOTTE
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_fleet_course_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fleet_manager_user_id UUID;
  company_name TEXT;
  course_date TEXT;
BEGIN
  -- Récupérer le user_id du gestionnaire de flotte
  SELECT user_id INTO fleet_manager_user_id
  FROM public.fleet_managers
  WHERE id = NEW.target_fleet_manager_id;
  
  -- Récupérer le nom de l'entreprise
  SELECT c.company_name INTO company_name
  FROM public.companies c
  WHERE c.id = NEW.company_id;
  
  course_date := to_char(NEW.scheduled_date, 'DD/MM à HH24:MI');
  
  INSERT INTO public.notifications (user_id, title, message, type, link, category)
  VALUES (
    fleet_manager_user_id,
    '🏢 Nouvelle demande de course entreprise',
    format('%s demande une course le %s', company_name, course_date),
    'course',
    '/fleet-dashboard?tab=requests',
    'fleet_course_request'
  );
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour les demandes entreprise vers flotte
DROP TRIGGER IF EXISTS on_fleet_course_request ON public.company_course_requests;
CREATE TRIGGER on_fleet_course_request
  AFTER INSERT ON public.company_course_requests
  FOR EACH ROW
  WHEN (NEW.target_fleet_manager_id IS NOT NULL)
  EXECUTE FUNCTION public.notify_fleet_course_request();

-- =====================================================
-- NOTIFICATIONS ADMIN - NOUVELLES INSCRIPTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_admin_new_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id UUID;
  driver_name TEXT;
BEGIN
  -- Récupérer le nom du chauffeur
  SELECT COALESCE(p.full_name, 'Nouveau chauffeur') INTO driver_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;
  
  -- Notifier tous les admins
  FOR admin_user_id IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link, category)
    VALUES (
      admin_user_id,
      '🚗 Nouvelle inscription chauffeur',
      format('%s vient de s''inscrire sur la plateforme', driver_name),
      'info',
      '/admin-dashboard?section=users&tab=drivers',
      'driver_registration'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger pour les nouveaux chauffeurs
DROP TRIGGER IF EXISTS on_new_driver_registration ON public.drivers;
CREATE TRIGGER on_new_driver_registration
  AFTER INSERT ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_registration();

-- =====================================================
-- INDEX POUR AMÉLIORER LES PERFORMANCES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, is_read) 
WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_category 
ON public.notifications(category) 
WHERE category IS NOT NULL;