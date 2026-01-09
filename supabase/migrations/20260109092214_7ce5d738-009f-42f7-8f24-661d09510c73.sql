-- Fix auto_dispatch_fleet_course to handle driver_schedules time columns correctly
CREATE OR REPLACE FUNCTION public.auto_dispatch_fleet_course(p_course_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, assigned_driver_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course RECORD;
  v_next_driver_id UUID;
  v_driver_name TEXT;
  v_driver_user_id UUID;
  v_fm_user_id UUID;
  v_auto_accept BOOLEAN;
  v_candidate RECORD;
  v_found_manual_driver BOOLEAN := false;
BEGIN
  BEGIN
    SELECT c.*, fm.user_id as fm_user_id
    INTO v_course
    FROM courses c
    JOIN fleet_managers fm ON fm.id = c.fleet_manager_id
    WHERE c.id = p_course_id
    FOR UPDATE NOWAIT;
  EXCEPTION
    WHEN lock_not_available THEN
      RETURN QUERY SELECT false, 'Course already being processed'::text, NULL::uuid;
      RETURN;
  END;
  
  IF v_course IS NULL THEN
    RETURN QUERY SELECT false, 'Course not found'::text, NULL::uuid;
    RETURN;
  END IF;
  
  IF v_course.fleet_manager_id IS NULL THEN
    RETURN QUERY SELECT false, 'Not a fleet manager course'::text, NULL::uuid;
    RETURN;
  END IF;
  
  IF v_course.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Course is not pending'::text, NULL::uuid;
    RETURN;
  END IF;
  
  v_fm_user_id := v_course.fm_user_id;
  
  -- Priorité 1: Partenaires avec auto-accept = true
  FOR v_candidate IN
    SELECT 
      fdp.driver_id,
      d.auto_accept_from_partners,
      CASE 
        WHEN v_course.pickup_latitude IS NOT NULL AND d.home_latitude IS NOT NULL THEN
          (6371 * acos(LEAST(1.0, GREATEST(-1.0,
            cos(radians(v_course.pickup_latitude)) * cos(radians(d.home_latitude)) *
            cos(radians(d.home_longitude) - radians(v_course.pickup_longitude)) +
            sin(radians(v_course.pickup_latitude)) * sin(radians(d.home_latitude))
          ))))
        ELSE 9999
      END as distance_km
    FROM fleet_driver_partnerships fdp
    JOIN drivers d ON d.id = fdp.driver_id
    WHERE fdp.fleet_manager_id = v_course.fleet_manager_id
    AND fdp.status = 'accepted'
    AND d.status = 'validated'
    AND d.auto_accept_from_partners = true
    AND NOT EXISTS (
      SELECT 1 FROM course_driver_exclusions cde
      WHERE cde.course_id = p_course_id AND cde.driver_id = fdp.driver_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM driver_schedules ds
      WHERE ds.driver_id = fdp.driver_id
      AND ds.date = v_course.scheduled_date::date
      AND ds.start_time <= (v_course.scheduled_date + (COALESCE(v_course.duration_minutes, 60) || ' minutes')::interval)::time
      AND ds.end_time >= v_course.scheduled_date::time
      AND ds.is_available = false
    )
    ORDER BY distance_km ASC, d.rating DESC NULLS LAST
    LIMIT 1
  LOOP
    v_next_driver_id := v_candidate.driver_id;
    v_auto_accept := true;
  END LOOP;
  
  -- Priorité 2: Chauffeurs internes avec auto-accept = true
  IF v_next_driver_id IS NULL THEN
    FOR v_candidate IN
      SELECT 
        fmd.driver_id,
        d.auto_accept_from_partners,
        CASE 
          WHEN v_course.pickup_latitude IS NOT NULL AND d.home_latitude IS NOT NULL THEN
            (6371 * acos(LEAST(1.0, GREATEST(-1.0,
              cos(radians(v_course.pickup_latitude)) * cos(radians(d.home_latitude)) *
              cos(radians(d.home_longitude) - radians(v_course.pickup_longitude)) +
              sin(radians(v_course.pickup_latitude)) * sin(radians(d.home_latitude))
            ))))
          ELSE 9999
        END as distance_km
      FROM fleet_manager_drivers fmd
      JOIN drivers d ON d.id = fmd.driver_id
      WHERE fmd.fleet_manager_id = v_course.fleet_manager_id
      AND fmd.status = 'active'
      AND d.status = 'validated'
      AND d.auto_accept_from_partners = true
      AND NOT EXISTS (
        SELECT 1 FROM course_driver_exclusions cde
        WHERE cde.course_id = p_course_id AND cde.driver_id = fmd.driver_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM driver_schedules ds
        WHERE ds.driver_id = fmd.driver_id
        AND ds.date = v_course.scheduled_date::date
        AND ds.start_time <= (v_course.scheduled_date + (COALESCE(v_course.duration_minutes, 60) || ' minutes')::interval)::time
        AND ds.end_time >= v_course.scheduled_date::time
        AND ds.is_available = false
      )
      ORDER BY distance_km ASC, d.rating DESC NULLS LAST
      LIMIT 1
    LOOP
      v_next_driver_id := v_candidate.driver_id;
      v_auto_accept := true;
    END LOOP;
  END IF;
  
  -- Si chauffeur avec auto-accept trouvé, assigner directement
  IF v_next_driver_id IS NOT NULL AND v_auto_accept THEN
    SELECT d.user_id, p.full_name 
    INTO v_driver_user_id, v_driver_name
    FROM drivers d
    JOIN profiles p ON p.id = d.user_id
    WHERE d.id = v_next_driver_id;
    
    UPDATE courses 
    SET driver_id = v_next_driver_id, status = 'accepted',
        dispatch_round = COALESCE(dispatch_round, 0) + 1,
        last_dispatched_at = NOW(), updated_at = NOW()
    WHERE id = p_course_id;
    
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_driver_user_id, 'Course auto-acceptée',
      'Une course a été automatiquement acceptée selon vos préférences.',
      'fleet_course_auto_accepted', '/driver-dashboard');
    
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (v_fm_user_id, 'Course assignée automatiquement',
      'La course a été automatiquement assignée à ' || v_driver_name,
      'fleet_course_auto_assigned', '/fleet-manager-dashboard');
    
    RETURN QUERY SELECT true, ('Course auto-assignée à ' || v_driver_name)::text, v_next_driver_id;
    RETURN;
  END IF;
  
  -- Vérifier s'il y a des chauffeurs avec auto_accept = false (attente manuelle)
  SELECT EXISTS (
    SELECT 1 FROM fleet_driver_partnerships fdp
    JOIN drivers d ON d.id = fdp.driver_id
    WHERE fdp.fleet_manager_id = v_course.fleet_manager_id
    AND fdp.status = 'accepted' AND d.status = 'validated'
    AND COALESCE(d.auto_accept_from_partners, false) = false
    AND NOT EXISTS (SELECT 1 FROM course_driver_exclusions cde WHERE cde.course_id = p_course_id AND cde.driver_id = fdp.driver_id)
    UNION
    SELECT 1 FROM fleet_manager_drivers fmd
    JOIN drivers d ON d.id = fmd.driver_id
    WHERE fmd.fleet_manager_id = v_course.fleet_manager_id
    AND fmd.status = 'active' AND d.status = 'validated'
    AND COALESCE(d.auto_accept_from_partners, false) = false
    AND NOT EXISTS (SELECT 1 FROM course_driver_exclusions cde WHERE cde.course_id = p_course_id AND cde.driver_id = fmd.driver_id)
  ) INTO v_found_manual_driver;
  
  IF v_found_manual_driver THEN
    -- Course reste en pending pour acceptation manuelle
    UPDATE courses 
    SET dispatch_round = COALESCE(dispatch_round, 0) + 1, last_dispatched_at = NOW(), updated_at = NOW()
    WHERE id = p_course_id;
    
    -- Notifier les chauffeurs éligibles
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT d.user_id, 'Nouvelle course disponible',
      'Une nouvelle course est disponible et attend votre acceptation.',
      'fleet_course_pending', '/driver-dashboard?tab=pending'
    FROM (
      SELECT fdp.driver_id FROM fleet_driver_partnerships fdp
      JOIN drivers dr ON dr.id = fdp.driver_id
      WHERE fdp.fleet_manager_id = v_course.fleet_manager_id AND fdp.status = 'accepted'
      AND dr.status = 'validated' AND COALESCE(dr.auto_accept_from_partners, false) = false
      AND NOT EXISTS (SELECT 1 FROM course_driver_exclusions cde WHERE cde.course_id = p_course_id AND cde.driver_id = fdp.driver_id)
      UNION
      SELECT fmd.driver_id FROM fleet_manager_drivers fmd
      JOIN drivers dr ON dr.id = fmd.driver_id
      WHERE fmd.fleet_manager_id = v_course.fleet_manager_id AND fmd.status = 'active'
      AND dr.status = 'validated' AND COALESCE(dr.auto_accept_from_partners, false) = false
      AND NOT EXISTS (SELECT 1 FROM course_driver_exclusions cde WHERE cde.course_id = p_course_id AND cde.driver_id = fmd.driver_id)
    ) eligible_drivers
    JOIN drivers d ON d.id = eligible_drivers.driver_id;
    
    RETURN QUERY SELECT true, 'Course en attente d''acceptation manuelle'::text, NULL::uuid;
    RETURN;
  END IF;
  
  -- Aucun chauffeur disponible - escalade
  UPDATE courses 
  SET dispatch_round = COALESCE(dispatch_round, 0) + 1, last_dispatched_at = NOW(), updated_at = NOW()
  WHERE id = p_course_id;
  
  INSERT INTO fleet_course_escalations (course_id, fleet_manager_id, escalation_type, escalation_reason, escalation_message, status)
  VALUES (p_course_id, v_course.fleet_manager_id, 'no_driver_available', 'auto_dispatch_failed',
    'Aucun chauffeur disponible après ' || (COALESCE(v_course.dispatch_round, 0) + 1) || ' tentative(s)', 'pending')
  ON CONFLICT DO NOTHING;
  
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (v_fm_user_id, 'Aucun chauffeur disponible', 'Aucun chauffeur n''est disponible pour cette course.',
    'fleet_dispatch_failed', '/fleet-manager-dashboard?tab=escalations');
  
  RETURN QUERY SELECT false, 'Aucun chauffeur disponible'::text, NULL::uuid;
END;
$$;