-- Ajouter les colonnes de gratuité pour fleet_managers (si elles n'existent pas déjà)
DO $$ 
BEGIN
  -- free_access_granted
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_managers' AND column_name = 'free_access_granted') THEN
    ALTER TABLE public.fleet_managers ADD COLUMN free_access_granted boolean DEFAULT false;
  END IF;
  
  -- free_access_start_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_managers' AND column_name = 'free_access_start_date') THEN
    ALTER TABLE public.fleet_managers ADD COLUMN free_access_start_date timestamp with time zone;
  END IF;
  
  -- free_access_end_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_managers' AND column_name = 'free_access_end_date') THEN
    ALTER TABLE public.fleet_managers ADD COLUMN free_access_end_date timestamp with time zone;
  END IF;
  
  -- free_access_type (unlimited, time_limited)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_managers' AND column_name = 'free_access_type') THEN
    ALTER TABLE public.fleet_managers ADD COLUMN free_access_type text DEFAULT NULL;
  END IF;
  
  -- stripe_subscription_paused (pour indiquer si l'abonnement Stripe est en pause)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_managers' AND column_name = 'stripe_subscription_paused') THEN
    ALTER TABLE public.fleet_managers ADD COLUMN stripe_subscription_paused boolean DEFAULT false;
  END IF;
  
  -- stripe_subscription_paused_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_managers' AND column_name = 'stripe_subscription_paused_at') THEN
    ALTER TABLE public.fleet_managers ADD COLUMN stripe_subscription_paused_at timestamp with time zone;
  END IF;
  
  -- trial_started_at (si n'existe pas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_managers' AND column_name = 'trial_started_at') THEN
    ALTER TABLE public.fleet_managers ADD COLUMN trial_started_at timestamp with time zone;
  END IF;
  
  -- trial_ends_at (si n'existe pas)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fleet_managers' AND column_name = 'trial_ends_at') THEN
    ALTER TABLE public.fleet_managers ADD COLUMN trial_ends_at timestamp with time zone;
  END IF;
END $$;

-- Créer un index pour les recherches de gratuité
CREATE INDEX IF NOT EXISTS idx_fleet_managers_free_access ON public.fleet_managers(free_access_granted, free_access_end_date);

-- Créer une fonction pour vérifier et mettre à jour le nombre de chauffeurs
CREATE OR REPLACE FUNCTION public.sync_fleet_manager_driver_count()
RETURNS TRIGGER AS $$
DECLARE
  driver_count INTEGER;
  max_free INTEGER;
  extra_count INTEGER;
  fm_record RECORD;
BEGIN
  -- Récupérer le fleet_manager_id selon l'opération
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO fm_record FROM public.fleet_managers WHERE id = OLD.fleet_manager_id;
  ELSE
    SELECT * INTO fm_record FROM public.fleet_managers WHERE id = NEW.fleet_manager_id;
  END IF;
  
  IF fm_record IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Compter les chauffeurs actifs
  SELECT COUNT(*) INTO driver_count
  FROM public.fleet_manager_drivers
  WHERE fleet_manager_id = fm_record.id
    AND status = 'active';
  
  -- Calculer les chauffeurs supplémentaires
  max_free := COALESCE(fm_record.max_free_drivers, 10);
  extra_count := GREATEST(0, driver_count - max_free);
  
  -- Mettre à jour le fleet_manager
  UPDATE public.fleet_managers
  SET 
    total_drivers = driver_count,
    extra_drivers_count = extra_count,
    updated_at = NOW()
  WHERE id = fm_record.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public SECURITY DEFINER;

-- Supprimer le trigger s'il existe et le recréer
DROP TRIGGER IF EXISTS trigger_sync_fleet_driver_count ON public.fleet_manager_drivers;

CREATE TRIGGER trigger_sync_fleet_driver_count
AFTER INSERT OR UPDATE OR DELETE ON public.fleet_manager_drivers
FOR EACH ROW
EXECUTE FUNCTION public.sync_fleet_manager_driver_count();