-- =====================================================
-- TRIGGER: Synchroniser le nombre de chauffeurs fleet
-- =====================================================

-- Supprimer l'ancien trigger/fonction s'ils existent
DROP TRIGGER IF EXISTS trigger_sync_fleet_driver_count ON fleet_manager_drivers;
DROP FUNCTION IF EXISTS sync_fleet_manager_driver_count();

-- Créer la fonction de synchronisation
CREATE OR REPLACE FUNCTION sync_fleet_manager_driver_count()
RETURNS TRIGGER AS $$
DECLARE
  v_fleet_manager_id uuid;
  v_driver_count integer;
BEGIN
  -- Déterminer le fleet_manager_id concerné
  IF TG_OP = 'DELETE' THEN
    v_fleet_manager_id := OLD.fleet_manager_id;
  ELSE
    v_fleet_manager_id := NEW.fleet_manager_id;
  END IF;

  -- Compter les chauffeurs actifs
  SELECT COUNT(*) INTO v_driver_count
  FROM fleet_manager_drivers
  WHERE fleet_manager_id = v_fleet_manager_id
    AND status = 'active';

  -- Mettre à jour le compteur dans fleet_managers
  UPDATE fleet_managers
  SET 
    total_drivers = v_driver_count,
    extra_drivers_count = GREATEST(0, v_driver_count - COALESCE(max_free_drivers, 10)),
    updated_at = now()
  WHERE id = v_fleet_manager_id;

  -- Notifier via pg_notify pour trigger l'edge function
  PERFORM pg_notify(
    'fleet_driver_count_changed',
    json_build_object(
      'fleet_manager_id', v_fleet_manager_id,
      'driver_count', v_driver_count,
      'operation', TG_OP
    )::text
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Créer le trigger
CREATE TRIGGER trigger_sync_fleet_driver_count
AFTER INSERT OR UPDATE OR DELETE ON fleet_manager_drivers
FOR EACH ROW
EXECUTE FUNCTION sync_fleet_manager_driver_count();

-- =====================================================
-- FONCTION pour vérifier/expirer les accès gratuits
-- =====================================================

CREATE OR REPLACE FUNCTION check_expired_free_access()
RETURNS void AS $$
BEGIN
  -- Expirer les accès gratuits chauffeurs
  UPDATE drivers
  SET 
    free_access_granted = false,
    free_access_type = NULL,
    subscription_status = 'expired'
  WHERE free_access_granted = true
    AND free_access_type = 'time_limited'
    AND free_access_end_date IS NOT NULL
    AND free_access_end_date < now();

  -- Expirer les accès gratuits gestionnaires
  UPDATE fleet_managers
  SET 
    free_access_granted = false,
    free_access_type = NULL,
    subscription_status = CASE 
      WHEN subscription_stripe_id IS NOT NULL AND stripe_subscription_paused = true THEN 'paused'
      ELSE 'expired'
    END
  WHERE free_access_granted = true
    AND free_access_type = 'time_limited'
    AND free_access_end_date IS NOT NULL
    AND free_access_end_date < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;