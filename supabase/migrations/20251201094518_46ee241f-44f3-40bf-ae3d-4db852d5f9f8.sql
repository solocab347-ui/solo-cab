-- Fonction pour mettre à jour le compteur total_rides d'un driver
CREATE OR REPLACE FUNCTION update_driver_total_rides()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la course vient d'être complétée ou si c'est une nouvelle course complétée
  IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') OR
     (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
    
    -- Mettre à jour le total_rides du driver concerné
    UPDATE drivers
    SET total_rides = (
      SELECT COUNT(*)
      FROM courses
      WHERE (driver_id = NEW.driver_id OR NEW.driver_id = ANY(driver_ids))
        AND status = 'completed'
    )
    WHERE id = NEW.driver_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur la table courses
DROP TRIGGER IF EXISTS trigger_update_driver_total_rides ON courses;
CREATE TRIGGER trigger_update_driver_total_rides
AFTER INSERT OR UPDATE OF status ON courses
FOR EACH ROW
EXECUTE FUNCTION update_driver_total_rides();

-- Recalculer immédiatement le total_rides pour tous les drivers existants
UPDATE drivers
SET total_rides = (
  SELECT COUNT(*)
  FROM courses
  WHERE (driver_id = drivers.id OR drivers.id = ANY(driver_ids))
    AND status = 'completed'
);