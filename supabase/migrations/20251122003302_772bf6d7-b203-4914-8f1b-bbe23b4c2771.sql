-- Fonction pour nettoyer automatiquement les anciennes notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  max_notifications INTEGER;
  notification_count INTEGER;
  notifications_to_delete INTEGER;
BEGIN
  -- Déterminer le rôle de l'utilisateur
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = NEW.user_id
  LIMIT 1;
  
  -- Définir la limite selon le rôle
  IF user_role = 'driver' THEN
    max_notifications := 30;
  ELSE
    max_notifications := 15;
  END IF;
  
  -- Compter le nombre actuel de notifications pour cet utilisateur
  SELECT COUNT(*) INTO notification_count
  FROM notifications
  WHERE user_id = NEW.user_id;
  
  -- Si on dépasse la limite, supprimer les plus anciennes
  IF notification_count > max_notifications THEN
    notifications_to_delete := notification_count - max_notifications;
    
    DELETE FROM notifications
    WHERE id IN (
      SELECT id
      FROM notifications
      WHERE user_id = NEW.user_id
      ORDER BY created_at ASC
      LIMIT notifications_to_delete
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger sur la table notifications
DROP TRIGGER IF EXISTS trigger_cleanup_old_notifications ON notifications;
CREATE TRIGGER trigger_cleanup_old_notifications
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION cleanup_old_notifications();