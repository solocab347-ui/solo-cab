-- Ajouter une colonne fleet_manager_id aux drivers pour les chauffeurs de flotte
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS fleet_manager_id uuid REFERENCES public.fleet_managers(id),
ADD COLUMN IF NOT EXISTS is_fleet_driver boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_clients boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS can_create_courses boolean DEFAULT true;

-- Créer une table pour le planning avec créneaux bloqués
CREATE TABLE IF NOT EXISTS public.driver_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  blocked_by_course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  blocked_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_driver_schedules_driver_date ON public.driver_schedules(driver_id, date);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_availability ON public.driver_schedules(driver_id, date, is_available);
CREATE INDEX IF NOT EXISTS idx_drivers_fleet_manager ON public.drivers(fleet_manager_id) WHERE fleet_manager_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.driver_schedules ENABLE ROW LEVEL SECURITY;

-- Policies pour driver_schedules
CREATE POLICY "Drivers can view their own schedules"
ON public.driver_schedules FOR SELECT
USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Drivers can manage their own schedules"
ON public.driver_schedules FOR ALL
USING (driver_id = get_driver_id(auth.uid()));

CREATE POLICY "Fleet managers can view their drivers schedules"
ON public.driver_schedules FOR SELECT
USING (EXISTS (
  SELECT 1 FROM fleet_manager_drivers fmd
  WHERE fmd.driver_id = driver_schedules.driver_id
  AND fmd.fleet_manager_id IN (
    SELECT id FROM fleet_managers WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Fleet managers can manage their drivers schedules"
ON public.driver_schedules FOR ALL
USING (EXISTS (
  SELECT 1 FROM fleet_manager_drivers fmd
  WHERE fmd.driver_id = driver_schedules.driver_id
  AND fmd.fleet_manager_id IN (
    SELECT id FROM fleet_managers WHERE user_id = auth.uid()
  )
));

CREATE POLICY "Admins can manage all schedules"
ON public.driver_schedules FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Fonction pour vérifier la disponibilité d'un chauffeur
CREATE OR REPLACE FUNCTION check_driver_availability(
  p_driver_id uuid,
  p_scheduled_date timestamp with time zone,
  p_duration_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_start timestamp with time zone;
  course_end timestamp with time zone;
  buffer_start timestamp with time zone;
  buffer_end timestamp with time zone;
  conflicting_count integer;
BEGIN
  course_start := p_scheduled_date;
  course_end := p_scheduled_date + (p_duration_minutes || ' minutes')::interval;
  
  -- Buffer de 1h avant et après
  buffer_start := course_start - interval '1 hour';
  buffer_end := course_end + interval '1 hour';
  
  -- Vérifier s'il y a des courses en conflit
  SELECT COUNT(*) INTO conflicting_count
  FROM courses c
  WHERE c.driver_id = p_driver_id
  AND c.status IN ('accepted', 'in_progress')
  AND c.id != COALESCE((SELECT id FROM courses WHERE scheduled_date = p_scheduled_date AND driver_id = p_driver_id LIMIT 1), '00000000-0000-0000-0000-000000000000')
  AND (
    -- La nouvelle course chevauche une course existante (avec buffer)
    (c.scheduled_date - interval '1 hour') < buffer_end
    AND (c.scheduled_date + (COALESCE(c.duration_minutes, 60) || ' minutes')::interval + interval '1 hour') > buffer_start
  );
  
  RETURN conflicting_count = 0;
END;
$$;

-- Fonction pour trouver un chauffeur disponible dans une flotte
CREATE OR REPLACE FUNCTION find_available_fleet_driver(
  p_fleet_manager_id uuid,
  p_scheduled_date timestamp with time zone,
  p_duration_minutes integer DEFAULT 60,
  p_excluded_driver_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  available_driver_id uuid;
BEGIN
  -- Trouver le premier chauffeur disponible dans la flotte
  SELECT d.id INTO available_driver_id
  FROM drivers d
  JOIN fleet_manager_drivers fmd ON d.id = fmd.driver_id
  WHERE fmd.fleet_manager_id = p_fleet_manager_id
  AND fmd.status = 'active'
  AND d.status = 'validated'
  AND d.id != COALESCE(p_excluded_driver_id, '00000000-0000-0000-0000-000000000000')
  AND check_driver_availability(d.id, p_scheduled_date, p_duration_minutes)
  ORDER BY d.rating DESC NULLS LAST, d.total_rides DESC NULLS LAST
  LIMIT 1;
  
  RETURN available_driver_id;
END;
$$;

-- Trigger pour bloquer automatiquement les créneaux après création d'une course
CREATE OR REPLACE FUNCTION auto_block_schedule_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_date date;
  start_block time;
  end_block time;
BEGIN
  IF NEW.status IN ('accepted', 'in_progress') THEN
    course_date := NEW.scheduled_date::date;
    start_block := (NEW.scheduled_date - interval '1 hour')::time;
    end_block := (NEW.scheduled_date + (COALESCE(NEW.duration_minutes, 60) || ' minutes')::interval + interval '1 hour')::time;
    
    -- Supprimer les anciens blocages pour cette course
    DELETE FROM driver_schedules 
    WHERE blocked_by_course_id = NEW.id;
    
    -- Créer le nouveau blocage
    INSERT INTO driver_schedules (
      driver_id,
      date,
      start_time,
      end_time,
      is_available,
      blocked_by_course_id,
      blocked_reason
    ) VALUES (
      NEW.driver_id,
      course_date,
      start_block,
      end_block,
      false,
      NEW.id,
      'Course planifiée (1h buffer avant/après)'
    );
  ELSIF OLD IS NOT NULL AND OLD.status IN ('accepted', 'in_progress') AND NEW.status IN ('completed', 'cancelled') THEN
    -- Libérer le créneau si la course est terminée ou annulée
    DELETE FROM driver_schedules 
    WHERE blocked_by_course_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS auto_block_schedule_on_course ON courses;
CREATE TRIGGER auto_block_schedule_on_course
AFTER INSERT OR UPDATE ON courses
FOR EACH ROW
EXECUTE FUNCTION auto_block_schedule_slot();

-- Mettre à jour fleet_driver_invitations pour utiliser is_paid correctement
ALTER TABLE public.fleet_driver_invitations 
ADD COLUMN IF NOT EXISTS driver_cost numeric DEFAULT 0;

-- Ajouter politique pour les clients puissent voir les chauffeurs de flotte
CREATE POLICY "Clients can view fleet drivers for booking"
ON public.drivers FOR SELECT
USING (
  is_fleet_driver = true 
  AND status = 'validated'
  AND public_profile_enabled = true
  AND fleet_manager_id IN (
    SELECT id FROM fleet_managers WHERE status = 'validated'
  )
);