-- =====================================================
-- FILE D'ATTENTE INTELLIGENTE - Gestion des conflits planning
-- =====================================================

-- Table pour les courses en conflit de planning
CREATE TABLE IF NOT EXISTS public.course_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL,
  conflict_reason TEXT NOT NULL DEFAULT 'buffer_violation',
  conflicting_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'client', -- 'client', 'fleet_manager', 'partner'
  source_id UUID, -- fleet_manager_id or partner_driver_id
  buffer_minutes_needed INTEGER,
  actual_gap_minutes INTEGER,
  priority INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'shared', 'forced', 'returned'
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_action TEXT, -- 'forced', 'shared', 'returned', 'cancelled', 'auto_placed'
  shared_to_driver_id UUID,
  auto_check_enabled BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_driver FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE
);

-- Index pour les performances
CREATE INDEX idx_course_queue_driver_status ON public.course_queue(driver_id, status);
CREATE INDEX idx_course_queue_created_at ON public.course_queue(created_at DESC);
CREATE INDEX idx_course_queue_expires_at ON public.course_queue(expires_at);

-- Enable RLS
ALTER TABLE public.course_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Drivers can view their own queue"
  ON public.course_queue FOR SELECT
  USING (driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Drivers can update their own queue"
  ON public.course_queue FOR UPDATE
  USING (driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can insert queue items"
  ON public.course_queue FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Drivers can delete their own queue items"
  ON public.course_queue FOR DELETE
  USING (driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  ));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_queue;

-- =====================================================
-- Fonction pour détecter les conflits de planning
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_course_buffer_conflict(
  p_driver_id UUID,
  p_course_id UUID,
  p_scheduled_date TIMESTAMP WITH TIME ZONE,
  p_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(
  has_conflict BOOLEAN,
  conflicting_course_id UUID,
  buffer_needed INTEGER,
  actual_gap INTEGER,
  conflict_type TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buffer_minutes INTEGER;
  v_buffer_enabled BOOLEAN;
  v_prev_course RECORD;
  v_next_course RECORD;
  v_course_end TIMESTAMP WITH TIME ZONE;
  v_gap_before INTEGER;
  v_gap_after INTEGER;
BEGIN
  -- Get driver's buffer settings
  SELECT 
    COALESCE(smart_buffer_min_minutes, 60) as buffer,
    COALESCE(smart_buffer_enabled, false) as enabled
  INTO v_buffer_minutes, v_buffer_enabled
  FROM drivers
  WHERE id = p_driver_id;
  
  -- If buffer not enabled, no conflict
  IF NOT v_buffer_enabled THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 0, 'none'::TEXT;
    RETURN;
  END IF;
  
  v_course_end := p_scheduled_date + (p_duration_minutes || ' minutes')::INTERVAL;
  
  -- Find previous course (before this one)
  SELECT c.id, c.scheduled_date, c.duration_minutes
  INTO v_prev_course
  FROM courses c
  WHERE c.driver_id = p_driver_id
    AND c.id != p_course_id
    AND c.status IN ('accepted', 'confirmed', 'in_progress')
    AND c.scheduled_date < p_scheduled_date
  ORDER BY c.scheduled_date DESC
  LIMIT 1;
  
  -- Find next course (after this one)
  SELECT c.id, c.scheduled_date, c.duration_minutes
  INTO v_next_course
  FROM courses c
  WHERE c.driver_id = p_driver_id
    AND c.id != p_course_id
    AND c.status IN ('accepted', 'confirmed', 'in_progress')
    AND c.scheduled_date > p_scheduled_date
  ORDER BY c.scheduled_date ASC
  LIMIT 1;
  
  -- Check gap with previous course
  IF v_prev_course.id IS NOT NULL THEN
    v_gap_before := EXTRACT(EPOCH FROM (p_scheduled_date - (v_prev_course.scheduled_date + (COALESCE(v_prev_course.duration_minutes, 60) || ' minutes')::INTERVAL))) / 60;
    
    IF v_gap_before < v_buffer_minutes THEN
      RETURN QUERY SELECT true, v_prev_course.id, v_buffer_minutes, v_gap_before::INTEGER, 'previous_course'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check gap with next course
  IF v_next_course.id IS NOT NULL THEN
    v_gap_after := EXTRACT(EPOCH FROM (v_next_course.scheduled_date - v_course_end)) / 60;
    
    IF v_gap_after < v_buffer_minutes THEN
      RETURN QUERY SELECT true, v_next_course.id, v_buffer_minutes, v_gap_after::INTEGER, 'next_course'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- No conflict
  RETURN QUERY SELECT false, NULL::UUID, 0, 0, 'none'::TEXT;
END;
$$;

-- =====================================================
-- Fonction pour auto-placer les courses en attente
-- =====================================================
CREATE OR REPLACE FUNCTION public.try_auto_place_queued_courses()
RETURNS TABLE(
  queue_id UUID,
  course_id UUID,
  placed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_item RECORD;
  v_conflict RECORD;
BEGIN
  -- Loop through pending queue items with auto_check enabled
  FOR v_queue_item IN 
    SELECT cq.*, c.scheduled_date, c.duration_minutes
    FROM course_queue cq
    JOIN courses c ON c.id = cq.course_id
    WHERE cq.status = 'pending'
      AND cq.auto_check_enabled = true
      AND cq.expires_at > now()
    ORDER BY cq.priority DESC, cq.created_at ASC
  LOOP
    -- Check if conflict still exists
    SELECT * INTO v_conflict
    FROM check_course_buffer_conflict(
      v_queue_item.driver_id,
      v_queue_item.course_id,
      v_queue_item.scheduled_date,
      COALESCE(v_queue_item.duration_minutes, 60)
    );
    
    IF NOT v_conflict.has_conflict THEN
      -- Conflict resolved - auto place the course
      UPDATE course_queue
      SET status = 'resolved',
          resolved_at = now(),
          resolved_action = 'auto_placed',
          updated_at = now()
      WHERE id = v_queue_item.id;
      
      RETURN QUERY SELECT v_queue_item.id, v_queue_item.course_id, true;
    ELSE
      RETURN QUERY SELECT v_queue_item.id, v_queue_item.course_id, false;
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- Trigger pour ajouter automatiquement les courses en conflit
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_check_course_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict RECORD;
  v_buffer_enabled BOOLEAN;
  v_fallback_action TEXT;
BEGIN
  -- Only check for newly accepted/confirmed courses
  IF NEW.status NOT IN ('accepted', 'confirmed') THEN
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
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_check_course_conflict ON courses;
CREATE TRIGGER trg_check_course_conflict
  BEFORE INSERT OR UPDATE OF status, scheduled_date
  ON courses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_course_conflict();

-- =====================================================
-- Trigger pour retour automatique au gestionnaire
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_fleet_course_return()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a fleet course is added to queue, notify the fleet manager
  IF NEW.source_type = 'fleet_manager' AND NEW.status = 'pending' THEN
    -- Create notification for the course sender (will be handled by app)
    INSERT INTO notifications (user_id, title, message, type, data)
    SELECT 
      fm.user_id,
      'Course en conflit de planning',
      'Le chauffeur a un conflit de planning pour cette course',
      'course_queue',
      jsonb_build_object(
        'queue_id', NEW.id,
        'course_id', NEW.course_id,
        'driver_id', NEW.driver_id
      )
    FROM fleet_managers fm
    JOIN fleet_manager_drivers fmd ON fmd.fleet_manager_id = fm.id
    WHERE fmd.driver_id = NEW.driver_id
      AND fmd.status = 'active'
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_fleet_course_return ON course_queue;
CREATE TRIGGER trg_handle_fleet_course_return
  AFTER INSERT
  ON course_queue
  FOR EACH ROW
  EXECUTE FUNCTION handle_fleet_course_return();