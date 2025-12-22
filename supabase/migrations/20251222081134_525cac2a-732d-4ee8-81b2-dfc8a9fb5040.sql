
-- ================================================
-- MIGRATION: Système de facturation et commissions pour les gestionnaires de flotte
-- ================================================

-- 1. Ajouter les colonnes de tarification au gestionnaire de flotte (comme pour les chauffeurs)
ALTER TABLE public.fleet_managers
ADD COLUMN IF NOT EXISTS base_fare numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS per_km_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS minimum_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tva_rate numeric DEFAULT 20.00,
ADD COLUMN IF NOT EXISTS tva_included boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS evening_surcharge numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekend_surcharge numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_commission_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS assignment_mode text DEFAULT 'manual' CHECK (assignment_mode IN ('manual', 'automatic')),
ADD COLUMN IF NOT EXISTS favorite_driver_priority boolean DEFAULT true;

-- 2. Ajouter les colonnes de commission par chauffeur
ALTER TABLE public.fleet_manager_drivers
ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'none')),
ADD COLUMN IF NOT EXISTS commission_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_salaried boolean DEFAULT false;

-- 3. Table pour les courses non affectées
CREATE TABLE IF NOT EXISTS public.unassigned_fleet_courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  fleet_manager_id uuid NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'no_available_driver',
  attempts integer DEFAULT 0,
  last_attempt_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES public.profiles(id),
  CONSTRAINT unassigned_fleet_courses_course_id_key UNIQUE(course_id)
);

-- Enable RLS
ALTER TABLE public.unassigned_fleet_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for unassigned_fleet_courses
CREATE POLICY "Fleet managers can manage their unassigned courses"
ON public.unassigned_fleet_courses
FOR ALL
USING (fleet_manager_id IN (
  SELECT id FROM fleet_managers WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage all unassigned courses"
ON public.unassigned_fleet_courses
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_unassigned_fleet_courses_fleet_manager 
ON public.unassigned_fleet_courses(fleet_manager_id);

CREATE INDEX IF NOT EXISTS idx_unassigned_fleet_courses_resolved 
ON public.unassigned_fleet_courses(resolved_at) WHERE resolved_at IS NULL;

-- 5. Function pour trouver automatiquement un chauffeur disponible dans la flotte
CREATE OR REPLACE FUNCTION public.auto_assign_fleet_driver(
  p_fleet_manager_id uuid,
  p_scheduled_date timestamp with time zone,
  p_duration_minutes integer DEFAULT 60,
  p_favorite_driver_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_priority_favorite boolean;
  v_available_driver_id uuid;
BEGIN
  -- Récupérer le paramètre de priorité chauffeur favori
  SELECT COALESCE(favorite_driver_priority, true) 
  INTO v_priority_favorite
  FROM fleet_managers
  WHERE id = p_fleet_manager_id;
  
  -- Si priorité chauffeur favori et qu'un favori est spécifié, vérifier sa disponibilité
  IF v_priority_favorite AND p_favorite_driver_id IS NOT NULL THEN
    IF check_driver_availability(p_favorite_driver_id, p_scheduled_date, p_duration_minutes) THEN
      RETURN p_favorite_driver_id;
    END IF;
  END IF;
  
  -- Chercher un autre chauffeur disponible
  v_available_driver_id := find_available_fleet_driver(
    p_fleet_manager_id, 
    p_scheduled_date, 
    p_duration_minutes, 
    p_favorite_driver_id
  );
  
  RETURN v_available_driver_id;
END;
$$;

-- 6. Fonction pour calculer le prix d'une course avec les tarifs du gestionnaire
CREATE OR REPLACE FUNCTION public.calculate_fleet_course_price(
  p_fleet_manager_id uuid,
  p_distance_km numeric,
  p_duration_minutes integer,
  p_use_hourly_rate boolean DEFAULT false,
  p_scheduled_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  base_price numeric,
  distance_price numeric,
  time_price numeric,
  subtotal numeric,
  tva_amount numeric,
  total_price numeric,
  surcharge_evening numeric,
  surcharge_weekend numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_base_fare numeric;
  v_per_km_rate numeric;
  v_hourly_rate numeric;
  v_tva_rate numeric;
  v_tva_included boolean;
  v_evening_surcharge numeric;
  v_weekend_surcharge numeric;
  v_minimum_price numeric;
  v_subtotal numeric;
  v_tva numeric;
  v_evening_amount numeric := 0;
  v_weekend_amount numeric := 0;
  v_is_evening boolean := false;
  v_is_weekend boolean := false;
  v_hour integer;
  v_day_of_week integer;
  v_calculated_subtotal numeric;
BEGIN
  -- Récupérer les tarifs du gestionnaire de flotte
  SELECT 
    COALESCE(fm.base_fare, 0),
    COALESCE(fm.per_km_rate, 0),
    COALESCE(fm.hourly_rate, 0),
    COALESCE(fm.tva_rate, 20),
    COALESCE(fm.tva_included, false),
    COALESCE(fm.evening_surcharge, 0),
    COALESCE(fm.weekend_surcharge, 0),
    COALESCE(fm.minimum_price, 0)
  INTO 
    v_base_fare,
    v_per_km_rate,
    v_hourly_rate,
    v_tva_rate,
    v_tva_included,
    v_evening_surcharge,
    v_weekend_surcharge,
    v_minimum_price
  FROM fleet_managers fm
  WHERE fm.id = p_fleet_manager_id;

  -- Déterminer si c'est le soir ou le weekend
  IF p_scheduled_date IS NOT NULL THEN
    v_hour := EXTRACT(HOUR FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    v_day_of_week := EXTRACT(DOW FROM p_scheduled_date AT TIME ZONE 'Europe/Paris');
    v_is_evening := (v_hour >= 20 OR v_hour < 6);
    v_is_weekend := (v_day_of_week = 0 OR v_day_of_week = 6);
  END IF;

  -- Calcul selon le type de course
  IF p_use_hourly_rate THEN
    base_price := 0;
    distance_price := 0;
    time_price := v_hourly_rate * (p_duration_minutes / 60.0);
    v_tva_rate := 20;
  ELSE
    base_price := v_base_fare;
    distance_price := v_per_km_rate * p_distance_km;
    time_price := 0;
    v_tva_rate := 10;
  END IF;

  v_calculated_subtotal := base_price + distance_price + time_price;

  -- Appliquer le prix minimum
  IF NOT p_use_hourly_rate AND v_minimum_price > 0 AND v_calculated_subtotal < v_minimum_price THEN
    distance_price := v_minimum_price - base_price;
    IF distance_price < 0 THEN
      distance_price := 0;
      base_price := v_minimum_price;
    END IF;
    v_calculated_subtotal := v_minimum_price;
  END IF;

  v_subtotal := v_calculated_subtotal;

  -- Appliquer les majorations
  IF v_is_evening AND v_evening_surcharge > 0 THEN
    v_evening_amount := v_subtotal * (v_evening_surcharge / 100);
    v_subtotal := v_subtotal + v_evening_amount;
  END IF;

  IF v_is_weekend AND v_weekend_surcharge > 0 THEN
    v_weekend_amount := v_subtotal * (v_weekend_surcharge / 100);
    v_subtotal := v_subtotal + v_weekend_amount;
  END IF;

  subtotal := v_subtotal;

  -- Calculer la TVA
  IF v_tva_included THEN
    v_tva := v_subtotal - (v_subtotal / (1 + v_tva_rate / 100));
  ELSE
    v_tva := v_subtotal * (v_tva_rate / 100);
  END IF;

  tva_amount := v_tva;
  total_price := v_subtotal + (CASE WHEN v_tva_included THEN 0 ELSE v_tva END);
  surcharge_evening := v_evening_amount;
  surcharge_weekend := v_weekend_amount;

  RETURN QUERY SELECT 
    base_price,
    distance_price,
    time_price,
    subtotal,
    tva_amount,
    total_price,
    surcharge_evening,
    surcharge_weekend;
END;
$$;

-- 7. Trigger pour gérer l'auto-assignation des courses
CREATE OR REPLACE FUNCTION public.handle_fleet_course_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fleet_manager_id uuid;
  v_assignment_mode text;
  v_client_favorite_driver uuid;
  v_assigned_driver_id uuid;
  v_fm_user_id uuid;
BEGIN
  -- Vérifier si c'est une course de flotte (driver_id appartient à une flotte)
  SELECT fmd.fleet_manager_id, fm.assignment_mode, fm.user_id
  INTO v_fleet_manager_id, v_assignment_mode, v_fm_user_id
  FROM fleet_manager_drivers fmd
  JOIN fleet_managers fm ON fm.id = fmd.fleet_manager_id
  WHERE fmd.driver_id = NEW.driver_id
  AND fmd.status = 'active'
  LIMIT 1;
  
  -- Si pas une course de flotte, sortir
  IF v_fleet_manager_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Si mode manuel, on laisse comme ça
  IF v_assignment_mode = 'manual' THEN
    -- Notifier le gestionnaire
    IF v_fm_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_fm_user_id,
        '🚗 Nouvelle demande de course',
        'Une nouvelle course attend votre validation',
        'course',
        '/fleet-dashboard?tab=courses'
      );
    END IF;
    RETURN NEW;
  END IF;
  
  -- Mode automatique: chercher un chauffeur disponible
  -- Récupérer le chauffeur favori du client si existe
  IF NEW.client_id IS NOT NULL THEN
    SELECT favorite_driver_id INTO v_client_favorite_driver
    FROM clients
    WHERE id = NEW.client_id;
  END IF;
  
  -- Chercher un chauffeur disponible
  v_assigned_driver_id := auto_assign_fleet_driver(
    v_fleet_manager_id,
    NEW.scheduled_date,
    COALESCE(NEW.duration_minutes, 60),
    v_client_favorite_driver
  );
  
  IF v_assigned_driver_id IS NOT NULL THEN
    -- Assigner le chauffeur et passer en accepté
    NEW.driver_id := v_assigned_driver_id;
    NEW.status := 'accepted';
    
    -- Notifier le gestionnaire
    IF v_fm_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_fm_user_id,
        '✅ Course auto-assignée',
        'Une course a été automatiquement assignée à un chauffeur',
        'success',
        '/fleet-dashboard?tab=courses'
      );
    END IF;
  ELSE
    -- Aucun chauffeur disponible: ajouter aux courses non affectées
    INSERT INTO unassigned_fleet_courses (course_id, fleet_manager_id, reason, attempts)
    VALUES (NEW.id, v_fleet_manager_id, 'no_available_driver', 1)
    ON CONFLICT (course_id) DO UPDATE SET
      attempts = unassigned_fleet_courses.attempts + 1,
      last_attempt_at = now();
    
    -- Notifier le gestionnaire d'urgence
    IF v_fm_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_fm_user_id,
        '⚠️ Course non affectée',
        'Aucun chauffeur disponible pour une course. Intervention requise.',
        'warning',
        '/fleet-dashboard?tab=courses'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger (sur INSERT uniquement pour les nouvelles courses)
DROP TRIGGER IF EXISTS trigger_fleet_course_assignment ON public.courses;
CREATE TRIGGER trigger_fleet_course_assignment
  BEFORE INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION handle_fleet_course_assignment();
