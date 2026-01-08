-- =====================================================
-- SYSTÈME DE RETRY AUTOMATIQUE POUR COURSES NON ATTRIBUÉES
-- =====================================================

-- Ajouter colonnes pour le système de retry
ALTER TABLE public.course_queue ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE public.course_queue ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.course_queue ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 10;
ALTER TABLE public.course_queue ADD COLUMN IF NOT EXISTS retry_interval_minutes INTEGER DEFAULT 15;
ALTER TABLE public.course_queue ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;

-- Mettre à jour les valeurs par défaut
UPDATE public.course_queue 
SET next_retry_at = created_at + INTERVAL '15 minutes'
WHERE next_retry_at IS NULL AND status = 'pending';

-- =====================================================
-- Table pour les escalades de courses (flux gestionnaire)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fleet_course_escalations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  company_request_id UUID REFERENCES public.company_course_requests(id) ON DELETE SET NULL,
  escalation_type TEXT NOT NULL DEFAULT 'driver_conflict', -- 'driver_conflict', 'driver_declined', 'timeout', 'no_driver_available'
  original_status TEXT,
  escalation_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '15 minutes'),
  retry_interval_minutes INTEGER DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reassigned', 'resolved', 'cancelled'
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by_user_id UUID,
  resolution_action TEXT, -- 'reassigned_to_driver', 'returned_to_pool', 'cancelled'
  reassigned_to_driver_id UUID REFERENCES public.drivers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_fleet_escalations_manager ON public.fleet_course_escalations(fleet_manager_id, status);
CREATE INDEX IF NOT EXISTS idx_fleet_escalations_next_retry ON public.fleet_course_escalations(next_retry_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.fleet_course_escalations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Fleet managers can view their escalations"
  ON public.fleet_course_escalations FOR SELECT
  USING (fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Fleet managers can update their escalations"
  ON public.fleet_course_escalations FOR UPDATE
  USING (fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  ));

CREATE POLICY "System can insert escalations"
  ON public.fleet_course_escalations FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.fleet_course_escalations;

-- =====================================================
-- Fonction de retry automatique pour file d'attente
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_course_queue_retries()
RETURNS TABLE(
  queue_id UUID,
  course_id UUID,
  action_taken TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_item RECORD;
  v_conflict RECORD;
  v_fallback_action TEXT;
BEGIN
  -- Process items that are due for retry
  FOR v_queue_item IN 
    SELECT cq.*, c.scheduled_date, c.duration_minutes, c.driver_id as course_driver_id
    FROM course_queue cq
    JOIN courses c ON c.id = cq.course_id
    WHERE cq.status = 'pending'
      AND cq.auto_check_enabled = true
      AND cq.expires_at > now()
      AND (cq.next_retry_at IS NULL OR cq.next_retry_at <= now())
      AND cq.retry_count < cq.max_retries
    ORDER BY cq.priority DESC, cq.created_at ASC
    LIMIT 50
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
          retry_count = retry_count + 1,
          last_retry_at = now(),
          updated_at = now()
      WHERE id = v_queue_item.id;
      
      RETURN QUERY SELECT v_queue_item.id, v_queue_item.course_id, 'auto_placed'::TEXT;
    ELSE
      -- Still conflict - update retry info
      UPDATE course_queue
      SET retry_count = retry_count + 1,
          last_retry_at = now(),
          next_retry_at = now() + (retry_interval_minutes || ' minutes')::INTERVAL,
          updated_at = now()
      WHERE id = v_queue_item.id;
      
      -- Get driver's fallback action
      SELECT COALESCE(smart_buffer_fallback_action, 'notify')
      INTO v_fallback_action
      FROM drivers WHERE id = v_queue_item.driver_id;
      
      -- If max retries reached and action is share_with_partner, auto-share
      IF v_queue_item.retry_count + 1 >= v_queue_item.max_retries THEN
        IF v_fallback_action = 'share_with_partner' THEN
          -- Mark for auto-sharing
          UPDATE course_queue
          SET status = 'shared',
              resolved_at = now(),
              resolved_action = 'auto_shared_timeout',
              updated_at = now()
          WHERE id = v_queue_item.id;
          
          RETURN QUERY SELECT v_queue_item.id, v_queue_item.course_id, 'auto_shared'::TEXT;
        ELSIF v_fallback_action = 'auto_decline' THEN
          -- Auto decline
          UPDATE course_queue
          SET status = 'returned',
              resolved_at = now(),
              resolved_action = 'auto_declined',
              updated_at = now()
          WHERE id = v_queue_item.id;
          
          -- Return course
          UPDATE courses
          SET status = 'pending',
              driver_id = NULL,
              updated_at = now()
          WHERE id = v_queue_item.course_id;
          
          RETURN QUERY SELECT v_queue_item.id, v_queue_item.course_id, 'auto_declined'::TEXT;
        ELSE
          RETURN QUERY SELECT v_queue_item.id, v_queue_item.course_id, 'max_retries_reached'::TEXT;
        END IF;
      ELSE
        RETURN QUERY SELECT v_queue_item.id, v_queue_item.course_id, 'retry_scheduled'::TEXT;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- Fonction de retry pour escalades gestionnaire
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_fleet_escalation_retries()
RETURNS TABLE(
  escalation_id UUID,
  course_id UUID,
  action_taken TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escalation RECORD;
  v_available_driver UUID;
BEGIN
  -- Process escalations due for retry
  FOR v_escalation IN 
    SELECT fce.*, c.scheduled_date, c.duration_minutes
    FROM fleet_course_escalations fce
    LEFT JOIN courses c ON c.id = fce.course_id
    WHERE fce.status = 'pending'
      AND (fce.next_retry_at IS NULL OR fce.next_retry_at <= now())
      AND fce.retry_count < fce.max_retries
    ORDER BY fce.created_at ASC
    LIMIT 50
  LOOP
    -- Try to find an available driver from the fleet
    SELECT fmd.driver_id INTO v_available_driver
    FROM fleet_manager_drivers fmd
    JOIN drivers d ON d.id = fmd.driver_id
    WHERE fmd.fleet_manager_id = v_escalation.fleet_manager_id
      AND fmd.status = 'active'
      AND d.status = 'validated'
      AND d.id != v_escalation.driver_id
      AND NOT EXISTS (
        SELECT 1 FROM course_queue cq 
        WHERE cq.driver_id = fmd.driver_id 
        AND cq.course_id = v_escalation.course_id
        AND cq.status = 'pending'
      )
    ORDER BY RANDOM()
    LIMIT 1;
    
    IF v_available_driver IS NOT NULL THEN
      -- Reassign to new driver
      UPDATE fleet_course_escalations
      SET status = 'reassigned',
          resolved_at = now(),
          resolution_action = 'reassigned_to_driver',
          reassigned_to_driver_id = v_available_driver,
          updated_at = now()
      WHERE id = v_escalation.id;
      
      -- Update course
      IF v_escalation.course_id IS NOT NULL THEN
        UPDATE courses
        SET driver_id = v_available_driver,
            status = 'pending',
            updated_at = now()
        WHERE id = v_escalation.course_id;
      END IF;
      
      -- Notify new driver
      INSERT INTO notifications (user_id, title, message, type, data)
      SELECT d.user_id, 
        'Nouvelle course assignée',
        'Le gestionnaire vous a assigné une course',
        'course_assigned',
        jsonb_build_object('course_id', v_escalation.course_id)
      FROM drivers d WHERE d.id = v_available_driver;
      
      RETURN QUERY SELECT v_escalation.id, v_escalation.course_id, 'reassigned'::TEXT;
    ELSE
      -- No driver available - update retry
      UPDATE fleet_course_escalations
      SET retry_count = retry_count + 1,
          last_retry_at = now(),
          next_retry_at = now() + (retry_interval_minutes || ' minutes')::INTERVAL,
          updated_at = now()
      WHERE id = v_escalation.id;
      
      -- If max retries reached, notify fleet manager
      IF v_escalation.retry_count + 1 >= v_escalation.max_retries THEN
        INSERT INTO notifications (user_id, title, message, type, data)
        SELECT fm.user_id,
          'Course sans preneur',
          'Aucun chauffeur disponible après plusieurs tentatives',
          'escalation_failed',
          jsonb_build_object('escalation_id', v_escalation.id, 'course_id', v_escalation.course_id)
        FROM fleet_managers fm WHERE fm.id = v_escalation.fleet_manager_id;
        
        RETURN QUERY SELECT v_escalation.id, v_escalation.course_id, 'max_retries_reached'::TEXT;
      ELSE
        RETURN QUERY SELECT v_escalation.id, v_escalation.course_id, 'retry_scheduled'::TEXT;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- Trigger pour créer escalade quand course retournée
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_create_fleet_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fleet_manager_id UUID;
BEGIN
  -- Only for returned courses from fleet
  IF NEW.status = 'returned' AND NEW.source_type = 'fleet_manager' THEN
    -- Find fleet manager
    SELECT fmd.fleet_manager_id INTO v_fleet_manager_id
    FROM fleet_manager_drivers fmd
    WHERE fmd.driver_id = NEW.driver_id
      AND fmd.status = 'active'
    LIMIT 1;
    
    IF v_fleet_manager_id IS NOT NULL THEN
      INSERT INTO fleet_course_escalations (
        fleet_manager_id,
        driver_id,
        course_id,
        escalation_type,
        escalation_reason,
        original_status
      ) VALUES (
        v_fleet_manager_id,
        NEW.driver_id,
        NEW.course_id,
        'driver_conflict',
        'Buffer planning insuffisant',
        'returned_from_queue'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_fleet_escalation ON course_queue;
CREATE TRIGGER trg_create_fleet_escalation
  AFTER UPDATE OF status
  ON course_queue
  FOR EACH ROW
  WHEN (NEW.status = 'returned')
  EXECUTE FUNCTION trigger_create_fleet_escalation();