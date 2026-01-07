-- =====================================================
-- MIGRATION: Système complet Gestionnaire-Chauffeur Partenaire
-- =====================================================

-- 1. Corriger la vue public_driver_profiles pour exclure les chauffeurs de flotte
DROP VIEW IF EXISTS public.public_driver_profiles;
CREATE VIEW public.public_driver_profiles AS
SELECT 
  id,
  user_id,
  company_name,
  vehicle_model,
  vehicle_brand,
  vehicle_color,
  vehicle_year,
  bio,
  service_description,
  services_offered,
  vehicle_equipment,
  working_sectors,
  vehicle_photos,
  gallery_photos,
  rating,
  total_rides,
  max_passengers,
  display_driver_name,
  display_company_name,
  show_phone,
  show_email,
  card_photo_url
FROM drivers d
WHERE public_profile_enabled = true 
  AND status = 'validated'
  AND (is_fleet_driver IS NULL OR is_fleet_driver = false)
  AND fleet_manager_id IS NULL;

-- 2. Créer la table pour les courses partagées gestionnaire → chauffeur partenaire
CREATE TABLE IF NOT EXISTS public.fleet_partner_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  partnership_id UUID NOT NULL REFERENCES public.fleet_driver_partnerships(id) ON DELETE CASCADE,
  fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  
  -- Montants et commission
  course_amount NUMERIC DEFAULT 0,
  commission_percentage NUMERIC DEFAULT 10,
  commission_amount NUMERIC DEFAULT 0,
  earnings_for_driver NUMERIC DEFAULT 0,
  
  -- Statut
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')),
  
  -- Type d'équipement
  equipment_type TEXT DEFAULT 'driver_owned' CHECK (equipment_type IN ('driver_owned', 'fleet_provided')),
  
  -- Mode de partage
  sharing_mode TEXT DEFAULT 'single' CHECK (sharing_mode IN ('single', 'pool')),
  pool_group_id UUID,
  
  -- Raisons
  decline_reason TEXT,
  cancelled_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Notifications
  driver_notified_at TIMESTAMPTZ,
  fleet_notified_at TIMESTAMPTZ,
  
  -- Règlement
  payment_settled BOOLEAN DEFAULT false,
  payment_settled_at TIMESTAMPTZ,
  payment_method_used TEXT,
  
  -- Pool claims
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES auth.users(id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_fleet_partner_courses_fleet ON fleet_partner_courses(fleet_manager_id);
CREATE INDEX IF NOT EXISTS idx_fleet_partner_courses_driver ON fleet_partner_courses(driver_id);
CREATE INDEX IF NOT EXISTS idx_fleet_partner_courses_course ON fleet_partner_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_fleet_partner_courses_status ON fleet_partner_courses(status);
CREATE INDEX IF NOT EXISTS idx_fleet_partner_courses_pool ON fleet_partner_courses(pool_group_id) WHERE pool_group_id IS NOT NULL;

-- 3. RLS pour fleet_partner_courses
ALTER TABLE public.fleet_partner_courses ENABLE ROW LEVEL SECURITY;

-- Gestionnaire peut voir ses courses partagées
CREATE POLICY "Fleet manager can view their shared courses"
ON public.fleet_partner_courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM fleet_managers fm
    WHERE fm.id = fleet_partner_courses.fleet_manager_id
    AND fm.user_id = auth.uid()
  )
);

-- Chauffeur partenaire peut voir les courses qui lui sont envoyées
CREATE POLICY "Partner driver can view courses sent to them"
ON public.fleet_partner_courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM drivers d
    WHERE d.id = fleet_partner_courses.driver_id
    AND d.user_id = auth.uid()
  )
);

-- Gestionnaire peut créer des courses partagées
CREATE POLICY "Fleet manager can create shared courses"
ON public.fleet_partner_courses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM fleet_managers fm
    WHERE fm.id = fleet_partner_courses.fleet_manager_id
    AND fm.user_id = auth.uid()
  )
);

-- Gestionnaire peut modifier ses courses
CREATE POLICY "Fleet manager can update their shared courses"
ON public.fleet_partner_courses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM fleet_managers fm
    WHERE fm.id = fleet_partner_courses.fleet_manager_id
    AND fm.user_id = auth.uid()
  )
);

-- Chauffeur partenaire peut modifier ses courses (accepter, refuser, etc.)
CREATE POLICY "Partner driver can update their assigned courses"
ON public.fleet_partner_courses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM drivers d
    WHERE d.id = fleet_partner_courses.driver_id
    AND d.user_id = auth.uid()
  )
);

-- 4. Ajouter champ equipment_type à fleet_driver_partnerships si manquant
ALTER TABLE public.fleet_driver_partnerships 
ADD COLUMN IF NOT EXISTS default_equipment_type TEXT DEFAULT 'driver_owned' 
CHECK (default_equipment_type IN ('driver_owned', 'fleet_provided'));

-- 5. Fonction pour vérifier si une course fleet est verrouillée (partage en cours)
CREATE OR REPLACE FUNCTION public.is_fleet_course_shared_locked(p_course_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'is_locked', EXISTS (
      SELECT 1 FROM fleet_partner_courses 
      WHERE course_id = p_course_id 
      AND status IN ('pending', 'accepted', 'in_progress')
    ),
    'status', (
      SELECT status FROM fleet_partner_courses 
      WHERE course_id = p_course_id 
      AND status IN ('pending', 'accepted', 'in_progress')
      LIMIT 1
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- 6. Fonction pour trouver le chauffeur partenaire le plus proche disponible
CREATE OR REPLACE FUNCTION public.find_nearest_available_fleet_partner(
  p_fleet_manager_id UUID,
  p_scheduled_date TIMESTAMPTZ,
  p_pickup_latitude DOUBLE PRECISION DEFAULT NULL,
  p_pickup_longitude DOUBLE PRECISION DEFAULT NULL,
  p_duration_minutes INTEGER DEFAULT 60,
  p_favorite_driver_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_partner RECORD;
BEGIN
  -- D'abord vérifier le chauffeur favori s'il est spécifié
  IF p_favorite_driver_id IS NOT NULL THEN
    -- Vérifier si le favori est un partenaire actif de cette flotte
    SELECT fdp.driver_id INTO v_driver_id
    FROM fleet_driver_partnerships fdp
    WHERE fdp.fleet_manager_id = p_fleet_manager_id
    AND fdp.driver_id = p_favorite_driver_id
    AND fdp.status = 'accepted'
    AND NOT EXISTS (
      SELECT 1 FROM driver_schedules ds
      WHERE ds.driver_id = fdp.driver_id
      AND ds.start_time <= p_scheduled_date + (p_duration_minutes || ' minutes')::interval
      AND ds.end_time >= p_scheduled_date
      AND ds.is_available = false
    );
    
    IF v_driver_id IS NOT NULL THEN
      RETURN v_driver_id;
    END IF;
  END IF;
  
  -- Sinon, chercher parmi tous les partenaires disponibles
  FOR v_partner IN 
    SELECT 
      fdp.driver_id,
      d.home_latitude,
      d.home_longitude,
      d.rating,
      CASE 
        WHEN p_pickup_latitude IS NOT NULL AND d.home_latitude IS NOT NULL THEN
          (6371 * acos(
            cos(radians(p_pickup_latitude)) * cos(radians(d.home_latitude)) *
            cos(radians(d.home_longitude) - radians(p_pickup_longitude)) +
            sin(radians(p_pickup_latitude)) * sin(radians(d.home_latitude))
          ))
        ELSE 9999
      END as distance_km
    FROM fleet_driver_partnerships fdp
    JOIN drivers d ON d.id = fdp.driver_id
    WHERE fdp.fleet_manager_id = p_fleet_manager_id
    AND fdp.status = 'accepted'
    AND d.status = 'validated'
    AND NOT EXISTS (
      SELECT 1 FROM driver_schedules ds
      WHERE ds.driver_id = fdp.driver_id
      AND ds.start_time <= p_scheduled_date + (p_duration_minutes || ' minutes')::interval
      AND ds.end_time >= p_scheduled_date
      AND ds.is_available = false
    )
    ORDER BY distance_km ASC, d.rating DESC NULLS LAST
    LIMIT 1
  LOOP
    RETURN v_partner.driver_id;
  END LOOP;
  
  RETURN NULL;
END;
$$;

-- 7. Trigger pour synchroniser le statut de la course originale
CREATE OR REPLACE FUNCTION public.sync_fleet_partner_course_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quand une course partenaire est acceptée
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Mettre la course originale en "accepted"
    UPDATE courses SET status = 'accepted', updated_at = now()
    WHERE id = NEW.course_id;
    
    -- Annuler les autres demandes du même pool
    IF NEW.pool_group_id IS NOT NULL THEN
      UPDATE fleet_partner_courses
      SET status = 'cancelled', cancelled_at = now(), cancelled_reason = 'Claimed by another partner'
      WHERE pool_group_id = NEW.pool_group_id
      AND id != NEW.id
      AND status = 'pending';
    END IF;
  END IF;
  
  -- Quand une course partenaire est en cours
  IF NEW.status = 'in_progress' AND OLD.status = 'accepted' THEN
    UPDATE courses SET status = 'in_progress', updated_at = now()
    WHERE id = NEW.course_id;
  END IF;
  
  -- Quand une course partenaire est terminée
  IF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
    UPDATE courses SET status = 'completed', updated_at = now()
    WHERE id = NEW.course_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_fleet_partner_course_status ON fleet_partner_courses;
CREATE TRIGGER trigger_sync_fleet_partner_course_status
AFTER UPDATE ON fleet_partner_courses
FOR EACH ROW
EXECUTE FUNCTION sync_fleet_partner_course_status();

-- 8. Activer Realtime pour fleet_partner_courses
ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_partner_courses;

-- 9. Mettre à jour find_nearest_available_fleet_driver pour inclure favorite_driver_priority
CREATE OR REPLACE FUNCTION public.find_nearest_available_fleet_driver(
  p_fleet_manager_id UUID,
  p_scheduled_date TIMESTAMPTZ,
  p_pickup_latitude DOUBLE PRECISION DEFAULT NULL,
  p_pickup_longitude DOUBLE PRECISION DEFAULT NULL,
  p_duration_minutes INTEGER DEFAULT 60,
  p_favorite_driver_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_driver RECORD;
  v_favorite_priority BOOLEAN;
BEGIN
  -- Récupérer le paramètre favorite_driver_priority
  SELECT COALESCE(favorite_driver_priority, true) INTO v_favorite_priority
  FROM fleet_managers WHERE id = p_fleet_manager_id;
  
  -- D'abord vérifier le chauffeur favori s'il est spécifié et priorité activée
  IF v_favorite_priority AND p_favorite_driver_id IS NOT NULL THEN
    SELECT fmd.driver_id INTO v_driver_id
    FROM fleet_manager_drivers fmd
    WHERE fmd.fleet_manager_id = p_fleet_manager_id
    AND fmd.driver_id = p_favorite_driver_id
    AND fmd.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM driver_schedules ds
      WHERE ds.driver_id = fmd.driver_id
      AND ds.start_time <= p_scheduled_date + (p_duration_minutes || ' minutes')::interval
      AND ds.end_time >= p_scheduled_date
      AND ds.is_available = false
    );
    
    IF v_driver_id IS NOT NULL THEN
      RETURN v_driver_id;
    END IF;
  END IF;
  
  -- Sinon, chercher parmi tous les chauffeurs disponibles
  FOR v_driver IN 
    SELECT 
      fmd.driver_id,
      d.home_latitude,
      d.home_longitude,
      d.rating,
      CASE 
        WHEN p_pickup_latitude IS NOT NULL AND d.home_latitude IS NOT NULL THEN
          (6371 * acos(
            cos(radians(p_pickup_latitude)) * cos(radians(d.home_latitude)) *
            cos(radians(d.home_longitude) - radians(p_pickup_longitude)) +
            sin(radians(p_pickup_latitude)) * sin(radians(d.home_latitude))
          ))
        ELSE 9999
      END as distance_km
    FROM fleet_manager_drivers fmd
    JOIN drivers d ON d.id = fmd.driver_id
    WHERE fmd.fleet_manager_id = p_fleet_manager_id
    AND fmd.status = 'active'
    AND d.status = 'validated'
    AND NOT EXISTS (
      SELECT 1 FROM driver_schedules ds
      WHERE ds.driver_id = fmd.driver_id
      AND ds.start_time <= p_scheduled_date + (p_duration_minutes || ' minutes')::interval
      AND ds.end_time >= p_scheduled_date
      AND ds.is_available = false
    )
    ORDER BY distance_km ASC, d.rating DESC NULLS LAST
    LIMIT 1
  LOOP
    RETURN v_driver.driver_id;
  END LOOP;
  
  RETURN NULL;
END;
$$;