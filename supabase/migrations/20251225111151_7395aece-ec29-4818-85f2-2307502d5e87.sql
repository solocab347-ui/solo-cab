-- Ajouter colonnes pour gestion vitrine du gestionnaire de flotte
ALTER TABLE public.fleet_manager_drivers 
ADD COLUMN IF NOT EXISTS visible_in_storefront BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS storefront_display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accept_auto_courses BOOLEAN DEFAULT true;

-- Ajouter colonne pour auto dispatch intelligent
ALTER TABLE public.fleet_managers
ADD COLUMN IF NOT EXISTS auto_dispatch_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dispatch_priority TEXT DEFAULT 'proximity' CHECK (dispatch_priority IN ('proximity', 'availability', 'rating'));

-- Créer table pour les courses refusées/repoussées par les chauffeurs
CREATE TABLE IF NOT EXISTS public.fleet_driver_declined_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  declined_by_driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  declined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reassigned', 'cancelled')),
  reassigned_to_driver_id UUID REFERENCES public.drivers(id),
  reassigned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_fleet_driver_declined_courses_fleet_manager 
ON public.fleet_driver_declined_courses(fleet_manager_id);

CREATE INDEX IF NOT EXISTS idx_fleet_driver_declined_courses_status 
ON public.fleet_driver_declined_courses(status);

CREATE INDEX IF NOT EXISTS idx_fleet_manager_drivers_storefront 
ON public.fleet_manager_drivers(fleet_manager_id, visible_in_storefront, storefront_display_order);

-- RLS pour fleet_driver_declined_courses
ALTER TABLE public.fleet_driver_declined_courses ENABLE ROW LEVEL SECURITY;

-- Policy: gestionnaire peut voir ses courses refusées
CREATE POLICY "Fleet managers can view their declined courses"
ON public.fleet_driver_declined_courses
FOR SELECT
USING (
  fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  )
);

-- Policy: gestionnaire peut modifier ses courses refusées
CREATE POLICY "Fleet managers can update their declined courses"
ON public.fleet_driver_declined_courses
FOR UPDATE
USING (
  fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  )
);

-- Policy: chauffeur peut créer un refus de course
CREATE POLICY "Fleet drivers can decline courses"
ON public.fleet_driver_declined_courses
FOR INSERT
WITH CHECK (
  declined_by_driver_id IN (
    SELECT d.id FROM public.drivers d WHERE d.user_id = auth.uid()
  )
);

-- Fonction pour trouver le chauffeur disponible le plus proche
CREATE OR REPLACE FUNCTION public.find_nearest_available_fleet_driver(
  p_fleet_manager_id UUID,
  p_scheduled_date TIMESTAMP WITH TIME ZONE,
  p_pickup_latitude NUMERIC,
  p_pickup_longitude NUMERIC,
  p_excluded_driver_id UUID DEFAULT NULL,
  p_duration_minutes INTEGER DEFAULT 60
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  available_driver_id UUID;
BEGIN
  -- Trouver le chauffeur disponible le plus proche qui accepte les courses auto
  SELECT d.id INTO available_driver_id
  FROM drivers d
  JOIN fleet_manager_drivers fmd ON d.id = fmd.driver_id
  WHERE fmd.fleet_manager_id = p_fleet_manager_id
  AND fmd.status = 'active'
  AND fmd.accept_auto_courses = true
  AND d.status = 'validated'
  AND d.id != COALESCE(p_excluded_driver_id, '00000000-0000-0000-0000-000000000000')
  AND d.home_latitude IS NOT NULL
  AND d.home_longitude IS NOT NULL
  AND check_driver_availability(d.id, p_scheduled_date, p_duration_minutes)
  ORDER BY (
    6371 * acos(
      LEAST(1.0, GREATEST(-1.0,
        cos(radians(p_pickup_latitude)) 
        * cos(radians(d.home_latitude)) 
        * cos(radians(d.home_longitude) - radians(p_pickup_longitude)) 
        + sin(radians(p_pickup_latitude)) 
        * sin(radians(d.home_latitude))
      ))
    )
  ) ASC
  LIMIT 1;
  
  RETURN available_driver_id;
END;
$$;