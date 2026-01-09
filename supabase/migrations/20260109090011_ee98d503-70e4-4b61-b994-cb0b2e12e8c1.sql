-- Fix find_nearest_available_fleet_partner to handle driver_schedules correctly
CREATE OR REPLACE FUNCTION public.find_nearest_available_fleet_partner(
  p_fleet_manager_id UUID,
  p_pickup_latitude DOUBLE PRECISION,
  p_pickup_longitude DOUBLE PRECISION,
  p_scheduled_date TIMESTAMP WITH TIME ZONE,
  p_duration_minutes INTEGER DEFAULT 60,
  p_favorite_driver_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id UUID;
  v_partner RECORD;
  v_scheduled_date DATE;
  v_scheduled_time TIME;
  v_end_time TIME;
BEGIN
  -- Extract date and time components
  v_scheduled_date := p_scheduled_date::date;
  v_scheduled_time := p_scheduled_date::time;
  v_end_time := (p_scheduled_date + (p_duration_minutes || ' minutes')::interval)::time;

  -- D'abord vérifier le chauffeur favori s'il est spécifié
  IF p_favorite_driver_id IS NOT NULL THEN
    -- Vérifier si le favori est un partenaire actif de cette flotte ET n'a pas refusé cette course
    SELECT fdp.driver_id INTO v_driver_id
    FROM fleet_driver_partnerships fdp
    WHERE fdp.fleet_manager_id = p_fleet_manager_id
    AND fdp.driver_id = p_favorite_driver_id
    AND fdp.status = 'accepted'
    -- Exclude if already returned this course
    AND (p_course_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM course_driver_exclusions cde 
      WHERE cde.course_id = p_course_id AND cde.driver_id = fdp.driver_id
    ))
    AND NOT EXISTS (
      SELECT 1 FROM driver_schedules ds
      WHERE ds.driver_id = fdp.driver_id
      AND ds.date = v_scheduled_date
      AND ds.start_time <= v_end_time
      AND ds.end_time >= v_scheduled_time
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
    -- Exclude drivers who already returned this course
    AND (p_course_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM course_driver_exclusions cde 
      WHERE cde.course_id = p_course_id AND cde.driver_id = d.id
    ))
    AND NOT EXISTS (
      SELECT 1 FROM driver_schedules ds
      WHERE ds.driver_id = fdp.driver_id
      AND ds.date = v_scheduled_date
      AND ds.start_time <= v_end_time
      AND ds.end_time >= v_scheduled_time
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