-- Corriger le trigger pour ne pas utiliser 'confirmed' qui n'existe pas dans l'enum course_status
CREATE OR REPLACE FUNCTION trigger_check_course_conflict()
RETURNS TRIGGER AS $$
DECLARE
  v_conflict RECORD;
  v_buffer_enabled BOOLEAN;
  v_fallback_action TEXT;
BEGIN
  -- Only check for newly accepted courses (confirmed n'existe pas dans l'enum)
  IF NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;
  
  -- Get driver settings
  SELECT 
    COALESCE(smart_buffer_enabled, false),
    COALESCE(smart_buffer_fallback_action, 'notify')
  INTO v_buffer_enabled, v_fallback_action
  FROM drivers
  WHERE id = NEW.driver_id;
  
  IF NOT v_buffer_enabled THEN
    RETURN NEW;
  END IF;
  
  -- Check for conflicts
  SELECT * INTO v_conflict
  FROM check_course_buffer_conflict(
    NEW.driver_id,
    NEW.id,
    NEW.scheduled_date,
    COALESCE(NEW.duration_minutes, 60)
  );
  
  IF v_conflict.has_conflict THEN
    -- Add to queue
    INSERT INTO course_queue (
      course_id,
      driver_id,
      conflict_reason,
      conflicting_course_id,
      buffer_minutes_needed,
      actual_gap_minutes,
      source_type,
      status
    ) VALUES (
      NEW.id,
      NEW.driver_id,
      v_conflict.conflict_type,
      v_conflict.conflicting_course_id,
      v_conflict.buffer_needed,
      v_conflict.actual_gap,
      CASE 
        WHEN NEW.fleet_manager_name IS NOT NULL THEN 'fleet_manager'
        ELSE 'client'
      END,
      'pending'
    );
    
    -- If auto_decline, update course status
    IF v_fallback_action = 'auto_decline' THEN
      NEW.status := 'cancelled';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;