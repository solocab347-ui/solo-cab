
-- =====================================================
-- SYSTÈME COMPLET : Entreprise → Gestionnaire → Chauffeur
-- =====================================================

-- 1. Ajouter la liaison company_course_requests → fleet_manager
ALTER TABLE public.company_course_requests 
ADD COLUMN IF NOT EXISTS target_fleet_manager_id UUID REFERENCES public.fleet_managers(id),
ADD COLUMN IF NOT EXISTS fleet_agreement_id UUID REFERENCES public.company_fleet_agreements(id),
ADD COLUMN IF NOT EXISTS dispatched_to_fleet_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fleet_dispatched_driver_id UUID REFERENCES public.drivers(id),
ADD COLUMN IF NOT EXISTS payment_flow TEXT DEFAULT 'direct' CHECK (payment_flow IN ('direct', 'via_fleet'));

-- 2. Ajouter la liaison fleet_partner_courses → company_course_requests
ALTER TABLE public.fleet_partner_courses
ADD COLUMN IF NOT EXISTS company_request_id UUID REFERENCES public.company_course_requests(id),
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'fleet' CHECK (payment_source IN ('fleet', 'company', 'client')),
ADD COLUMN IF NOT EXISTS company_pays_fleet_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fleet_pays_driver_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS company_payment_status TEXT DEFAULT 'pending' CHECK (company_payment_status IN ('pending', 'invoiced', 'paid')),
ADD COLUMN IF NOT EXISTS fleet_payment_to_driver_status TEXT DEFAULT 'pending' CHECK (fleet_payment_to_driver_status IN ('pending', 'paid'));

-- 3. Table d'escalade pour courses non assignées
CREATE TABLE IF NOT EXISTS public.course_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    fleet_manager_id UUID REFERENCES public.fleet_managers(id),
    driver_id UUID REFERENCES public.drivers(id),
    company_request_id UUID REFERENCES public.company_course_requests(id),
    escalation_reason TEXT NOT NULL CHECK (escalation_reason IN ('no_driver_available', 'all_declined', 'timeout', 'smart_buffer_conflict', 'manual')),
    escalation_level INTEGER DEFAULT 1,
    suggested_actions JSONB DEFAULT '[]'::jsonb,
    resolution_status TEXT DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'cancelled', 'shared_with_partner')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Plannings chauffeurs indépendants (agenda intelligent)
CREATE TABLE IF NOT EXISTS public.driver_availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=dimanche
    specific_date DATE, -- Pour disponibilités ponctuelles
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    slot_type TEXT DEFAULT 'recurring' CHECK (slot_type IN ('recurring', 'specific', 'exception')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- 5. Paramètres agenda intelligent pour chauffeurs indépendants
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS smart_buffer_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS smart_buffer_min_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS smart_buffer_fallback_action TEXT DEFAULT 'notify' CHECK (smart_buffer_fallback_action IN ('notify', 'auto_decline', 'share_with_partner')),
ADD COLUMN IF NOT EXISTS auto_accept_from_partners BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_daily_courses INTEGER,
ADD COLUMN IF NOT EXISTS preferred_zones TEXT[];

-- 6. Vue pour demandes entreprise avec gestionnaire
CREATE OR REPLACE VIEW public.company_fleet_course_requests_view AS
SELECT 
    ccr.*,
    c.company_name,
    c.contact_email as company_email,
    fm.company_name as fleet_manager_name,
    fm.contact_email as fleet_manager_email,
    cfa.payment_frequency,
    cfa.payment_methods,
    CASE 
        WHEN ccr.target_fleet_manager_id IS NOT NULL THEN 'via_fleet'
        ELSE 'direct'
    END as request_type
FROM public.company_course_requests ccr
LEFT JOIN public.companies c ON ccr.company_id = c.id
LEFT JOIN public.fleet_managers fm ON ccr.target_fleet_manager_id = fm.id
LEFT JOIN public.company_fleet_agreements cfa ON ccr.fleet_agreement_id = cfa.id;

-- 7. Fonction de dispatch intelligent avec escalade
CREATE OR REPLACE FUNCTION public.dispatch_company_course_to_fleet(
    p_company_request_id UUID,
    p_fleet_manager_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request RECORD;
    v_agreement RECORD;
    v_driver RECORD;
    v_result JSONB;
BEGIN
    -- Récupérer la demande
    SELECT * INTO v_request FROM company_course_requests WHERE id = p_company_request_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found');
    END IF;
    
    -- Vérifier l'accord entreprise-gestionnaire
    SELECT * INTO v_agreement 
    FROM company_fleet_agreements 
    WHERE company_id = v_request.company_id 
    AND fleet_manager_id = p_fleet_manager_id 
    AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active agreement between company and fleet manager');
    END IF;
    
    -- Mettre à jour la demande
    UPDATE company_course_requests SET
        target_fleet_manager_id = p_fleet_manager_id,
        fleet_agreement_id = v_agreement.id,
        dispatched_to_fleet_at = now(),
        payment_flow = 'via_fleet',
        status = 'dispatched_to_fleet',
        updated_at = now()
    WHERE id = p_company_request_id;
    
    -- Chercher le meilleur chauffeur disponible
    SELECT d.id, d.user_id, fdp.commission_percentage
    INTO v_driver
    FROM fleet_driver_partnerships fdp
    JOIN drivers d ON d.id = fdp.driver_id
    WHERE fdp.fleet_manager_id = p_fleet_manager_id
    AND fdp.status = 'active'
    AND NOT EXISTS (
        SELECT 1 FROM courses c 
        WHERE c.driver_id = d.id 
        AND c.scheduled_date::date = v_request.scheduled_date::date
        AND c.status IN ('accepted', 'in_progress')
        AND (
            c.scheduled_date BETWEEN v_request.scheduled_date - interval '1 hour' 
            AND v_request.scheduled_date + interval '1 hour'
        )
    )
    ORDER BY fdp.created_at ASC
    LIMIT 1;
    
    IF v_driver.id IS NOT NULL THEN
        -- Créer l'entrée dans fleet_partner_courses
        INSERT INTO fleet_partner_courses (
            course_id,
            partnership_id,
            fleet_manager_id,
            driver_id,
            company_request_id,
            company_id,
            payment_source,
            status
        ) VALUES (
            v_request.final_course_id,
            (SELECT id FROM fleet_driver_partnerships WHERE fleet_manager_id = p_fleet_manager_id AND driver_id = v_driver.id LIMIT 1),
            p_fleet_manager_id,
            v_driver.id,
            p_company_request_id,
            v_request.company_id,
            'company',
            'pending'
        );
        
        RETURN jsonb_build_object(
            'success', true, 
            'driver_id', v_driver.id,
            'status', 'dispatched'
        );
    ELSE
        -- Aucun chauffeur disponible - créer escalade
        INSERT INTO course_escalations (
            course_id,
            fleet_manager_id,
            company_request_id,
            escalation_reason,
            suggested_actions
        ) VALUES (
            v_request.final_course_id,
            p_fleet_manager_id,
            p_company_request_id,
            'no_driver_available',
            jsonb_build_array(
                jsonb_build_object('action', 'share_with_partner', 'label', 'Partager avec un partenaire'),
                jsonb_build_object('action', 'notify_company', 'label', 'Notifier l''entreprise'),
                jsonb_build_object('action', 'cancel', 'label', 'Annuler la course')
            )
        );
        
        RETURN jsonb_build_object(
            'success', false, 
            'reason', 'no_driver_available',
            'escalation_created', true
        );
    END IF;
END;
$$;

-- 8. Fonction vérification agenda intelligent chauffeur indépendant
CREATE OR REPLACE FUNCTION public.check_driver_smart_availability(
    p_driver_id UUID,
    p_scheduled_date TIMESTAMPTZ,
    p_duration_minutes INTEGER DEFAULT 60,
    p_pickup_lat NUMERIC DEFAULT NULL,
    p_pickup_lon NUMERIC DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_driver RECORD;
    v_slot RECORD;
    v_prev_course RECORD;
    v_next_course RECORD;
    v_travel_time INTEGER;
    v_buffer_needed INTEGER;
    v_available_time INTEGER;
BEGIN
    -- Récupérer les paramètres du chauffeur
    SELECT * INTO v_driver FROM drivers WHERE id = p_driver_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('available', false, 'reason', 'driver_not_found');
    END IF;
    
    -- Vérifier le créneau de disponibilité
    SELECT * INTO v_slot 
    FROM driver_availability_slots
    WHERE driver_id = p_driver_id
    AND is_available = true
    AND (
        (slot_type = 'recurring' AND day_of_week = EXTRACT(DOW FROM p_scheduled_date))
        OR (slot_type = 'specific' AND specific_date = p_scheduled_date::date)
    )
    AND start_time <= p_scheduled_date::time
    AND end_time >= (p_scheduled_date + (p_duration_minutes || ' minutes')::interval)::time;
    
    -- Si smart buffer désactivé, retourner disponible si dans le créneau
    IF NOT COALESCE(v_driver.smart_buffer_enabled, false) THEN
        RETURN jsonb_build_object(
            'available', v_slot IS NOT NULL OR v_slot.id IS NULL, -- disponible si pas de créneaux définis ou dans un créneau
            'buffer_type', 'none',
            'message', 'Buffer intelligent désactivé'
        );
    END IF;
    
    -- Chercher la course précédente
    SELECT * INTO v_prev_course
    FROM courses
    WHERE driver_id = p_driver_id
    AND status IN ('accepted', 'in_progress')
    AND scheduled_date < p_scheduled_date
    AND scheduled_date::date = p_scheduled_date::date
    ORDER BY scheduled_date DESC
    LIMIT 1;
    
    -- Chercher la course suivante
    SELECT * INTO v_next_course
    FROM courses
    WHERE driver_id = p_driver_id
    AND status IN ('accepted', 'in_progress')
    AND scheduled_date > p_scheduled_date
    AND scheduled_date::date = p_scheduled_date::date
    ORDER BY scheduled_date ASC
    LIMIT 1;
    
    -- Calculer le buffer nécessaire
    v_buffer_needed := COALESCE(v_driver.smart_buffer_min_minutes, 15);
    
    -- Vérifier avec la course précédente
    IF v_prev_course IS NOT NULL THEN
        v_available_time := EXTRACT(EPOCH FROM (p_scheduled_date - (v_prev_course.scheduled_date + (COALESCE(v_prev_course.duration_minutes, 60) || ' minutes')::interval))) / 60;
        
        -- Estimation temps de trajet (simple)
        v_travel_time := 15; -- Par défaut 15 min, sera calculé par edge function avec Mapbox
        
        IF v_available_time < (v_travel_time + v_buffer_needed) THEN
            RETURN jsonb_build_object(
                'available', false,
                'reason', 'insufficient_time_after_previous',
                'available_minutes', v_available_time,
                'required_minutes', v_travel_time + v_buffer_needed,
                'fallback_action', v_driver.smart_buffer_fallback_action
            );
        END IF;
    END IF;
    
    -- Vérifier avec la course suivante
    IF v_next_course IS NOT NULL THEN
        v_available_time := EXTRACT(EPOCH FROM (v_next_course.scheduled_date - (p_scheduled_date + (p_duration_minutes || ' minutes')::interval))) / 60;
        
        IF v_available_time < v_buffer_needed THEN
            RETURN jsonb_build_object(
                'available', false,
                'reason', 'insufficient_time_before_next',
                'available_minutes', v_available_time,
                'required_minutes', v_buffer_needed,
                'fallback_action', v_driver.smart_buffer_fallback_action
            );
        END IF;
    END IF;
    
    RETURN jsonb_build_object(
        'available', true,
        'buffer_type', 'smart',
        'buffer_minutes', v_buffer_needed,
        'message', 'Chauffeur disponible'
    );
END;
$$;

-- 9. Trigger pour escalade automatique si course déclinée par tous
CREATE OR REPLACE FUNCTION public.auto_escalate_declined_course()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_partners INTEGER;
    v_declined_count INTEGER;
BEGIN
    IF NEW.status = 'declined' AND OLD.status != 'declined' THEN
        -- Compter les partenaires actifs
        SELECT COUNT(*) INTO v_total_partners
        FROM fleet_driver_partnerships
        WHERE fleet_manager_id = NEW.fleet_manager_id
        AND status = 'active';
        
        -- Compter les courses déclinées pour cette course
        SELECT COUNT(*) INTO v_declined_count
        FROM fleet_partner_courses
        WHERE course_id = NEW.course_id
        AND status = 'declined';
        
        -- Si tous ont décliné, créer une escalade
        IF v_declined_count >= v_total_partners THEN
            INSERT INTO course_escalations (
                course_id,
                fleet_manager_id,
                escalation_reason,
                suggested_actions
            ) VALUES (
                NEW.course_id,
                NEW.fleet_manager_id,
                'all_declined',
                jsonb_build_array(
                    jsonb_build_object('action', 'share_externally', 'label', 'Partager avec un partenaire externe'),
                    jsonb_build_object('action', 'reassign_manually', 'label', 'Réassigner manuellement'),
                    jsonb_build_object('action', 'cancel', 'label', 'Annuler la course')
                )
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_escalate_declined ON fleet_partner_courses;
CREATE TRIGGER trigger_auto_escalate_declined
AFTER UPDATE ON fleet_partner_courses
FOR EACH ROW
EXECUTE FUNCTION auto_escalate_declined_course();

-- 10. RLS Policies
ALTER TABLE public.course_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_availability_slots ENABLE ROW LEVEL SECURITY;

-- Policies escalations
CREATE POLICY "Fleet managers can view their escalations"
ON public.course_escalations FOR SELECT
USING (fleet_manager_id IN (SELECT id FROM fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Fleet managers can update their escalations"
ON public.course_escalations FOR UPDATE
USING (fleet_manager_id IN (SELECT id FROM fleet_managers WHERE user_id = auth.uid()));

CREATE POLICY "Drivers can view their escalations"
ON public.course_escalations FOR SELECT
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- Policies availability slots
CREATE POLICY "Drivers can manage their availability"
ON public.driver_availability_slots FOR ALL
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Fleet managers can view their drivers availability"
ON public.driver_availability_slots FOR SELECT
USING (driver_id IN (
    SELECT driver_id FROM fleet_manager_drivers 
    WHERE fleet_manager_id IN (SELECT id FROM fleet_managers WHERE user_id = auth.uid())
    AND status = 'active'
));

-- 11. Index pour performance
CREATE INDEX IF NOT EXISTS idx_course_escalations_fleet ON course_escalations(fleet_manager_id, resolution_status);
CREATE INDEX IF NOT EXISTS idx_course_escalations_course ON course_escalations(course_id);
CREATE INDEX IF NOT EXISTS idx_driver_availability_driver ON driver_availability_slots(driver_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_driver_availability_date ON driver_availability_slots(driver_id, specific_date);
CREATE INDEX IF NOT EXISTS idx_company_requests_fleet ON company_course_requests(target_fleet_manager_id, status);
CREATE INDEX IF NOT EXISTS idx_fleet_partner_courses_company ON fleet_partner_courses(company_request_id);

-- 12. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_escalations;
