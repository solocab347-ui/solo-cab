
-- =====================================================
-- SYSTÈME D'AUTO-APPRENTISSAGE ET SELF-HEALING COMPLET
-- =====================================================

-- 1. TABLE DES PATTERNS D'ERREURS (détection intelligente)
DROP TABLE IF EXISTS error_patterns CASCADE;
CREATE TABLE public.error_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_code TEXT NOT NULL UNIQUE,
  pattern_name TEXT NOT NULL,
  description TEXT,
  detection_query TEXT,
  entity_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  occurrences_count INTEGER DEFAULT 0,
  last_occurrence_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  auto_fix_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABLE DES SOLUTIONS
DROP TABLE IF EXISTS error_solutions CASCADE;
CREATE TABLE public.error_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID REFERENCES error_patterns(id) ON DELETE CASCADE,
  solution_code TEXT NOT NULL,
  solution_name TEXT NOT NULL,
  description TEXT,
  fix_query TEXT,
  fix_function TEXT,
  validation_query TEXT,
  success_rate NUMERIC(5,2) DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  successful_fixes INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLE DES ERREURS DÉTECTÉES
DROP TABLE IF EXISTS detected_errors CASCADE;
CREATE TABLE public.detected_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID REFERENCES error_patterns(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  error_context JSONB,
  detected_at TIMESTAMPTZ DEFAULT now(),
  detected_by TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fixing', 'fixed', 'failed', 'ignored')),
  fixed_at TIMESTAMPTZ,
  fix_solution_id UUID REFERENCES error_solutions(id),
  fix_details JSONB,
  user_id UUID,
  driver_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABLE DES RÈGLES DE VALIDATION
DROP TABLE IF EXISTS validation_rules CASCADE;
CREATE TABLE public.validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code TEXT NOT NULL UNIQUE,
  rule_name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  validation_query TEXT NOT NULL,
  error_message TEXT NOT NULL,
  auto_fix_solution_id UUID REFERENCES error_solutions(id),
  is_blocking BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABLE DES DÉPENDANCES
DROP TABLE IF EXISTS entity_dependencies CASCADE;
CREATE TABLE public.entity_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_entity TEXT NOT NULL,
  child_entity TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  condition TEXT,
  auto_create BOOLEAN DEFAULT false,
  auto_create_solution_id UUID REFERENCES error_solutions(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABLE MÉTRIQUES
DROP TABLE IF EXISTS system_health_metrics CASCADE;
CREATE TABLE public.system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metric_data JSONB,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PATTERNS D'ERREURS CONNUS
-- =====================================================

INSERT INTO error_patterns (pattern_code, pattern_name, description, entity_type, detection_query, severity) VALUES
('MISSING_INVOICE', 'Facture manquante pour course terminée', 
 'Une course est terminée mais aucune facture n''a été créée',
 'course',
 'SELECT c.id FROM courses c LEFT JOIN factures f ON f.course_id = c.id WHERE c.status = ''completed'' AND f.id IS NULL',
 'high'),
('MISSING_DEVIS', 'Devis manquant pour course', 
 'Une course existe sans devis associé',
 'course',
 'SELECT c.id FROM courses c LEFT JOIN devis d ON d.course_id = c.id WHERE d.id IS NULL AND c.status != ''cancelled''',
 'medium'),
('UNPAID_COMPLETED_COURSE', 'Course terminée non payée', 
 'Une course est terminée depuis plus de 24h sans paiement',
 'course',
 'SELECT c.id FROM courses c LEFT JOIN factures f ON f.course_id = c.id WHERE c.status = ''completed'' AND (f.payment_status IS NULL OR f.payment_status = ''pending'') AND c.updated_at < NOW() - INTERVAL ''24 hours''',
 'high'),
('STUCK_COURSE', 'Course bloquée en statut intermédiaire', 
 'Une course est en statut en cours depuis plus de 12h',
 'course',
 'SELECT c.id FROM courses c WHERE c.status IN (''accepted'', ''in_progress'') AND c.updated_at < NOW() - INTERVAL ''12 hours''',
 'medium'),
('MISSING_COMMISSION', 'Commission non calculée', 
 'Une course terminée n''a pas de commission calculée',
 'course',
 'SELECT c.id FROM courses c WHERE c.status = ''completed'' AND c.commission_amount IS NULL',
 'high')
ON CONFLICT (pattern_code) DO UPDATE SET
  description = EXCLUDED.description,
  detection_query = EXCLUDED.detection_query,
  updated_at = now();

-- =====================================================
-- DÉPENDANCES ENTRE ENTITÉS
-- =====================================================

INSERT INTO entity_dependencies (parent_entity, child_entity, relationship_type, condition, auto_create) VALUES
('course', 'facture', 'requires', 'status = ''completed''', true),
('course', 'devis', 'requires', 'status != ''cancelled''', false),
('facture', 'payment', 'creates', 'payment_status = ''paid''', false);

-- =====================================================
-- FONCTION DE DÉTECTION ET CORRECTION
-- =====================================================

CREATE OR REPLACE FUNCTION detect_and_fix_errors()
RETURNS TABLE(
  pattern_code TEXT,
  entities_found INTEGER,
  entities_fixed INTEGER,
  errors_logged INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pattern RECORD;
  entity_record RECORD;
  solution RECORD;
  fix_result BOOLEAN;
  found_count INTEGER;
  fixed_count INTEGER;
  error_count INTEGER;
BEGIN
  FOR pattern IN 
    SELECT * FROM error_patterns 
    WHERE is_active = true 
    ORDER BY severity DESC
  LOOP
    found_count := 0;
    fixed_count := 0;
    error_count := 0;
    
    IF pattern.detection_query IS NOT NULL THEN
      FOR entity_record IN EXECUTE pattern.detection_query
      LOOP
        found_count := found_count + 1;
        
        INSERT INTO detected_errors (pattern_id, entity_type, entity_id, detected_by, status)
        VALUES (pattern.id, pattern.entity_type, entity_record.id, 'health_check', 'pending')
        ON CONFLICT DO NOTHING;
        
        IF pattern.auto_fix_enabled THEN
          SELECT * INTO solution 
          FROM error_solutions 
          WHERE pattern_id = pattern.id AND is_active = true 
          ORDER BY priority DESC, success_rate DESC 
          LIMIT 1;
          
          IF solution.id IS NOT NULL AND solution.fix_function IS NOT NULL THEN
            BEGIN
              EXECUTE format('SELECT %I($1)', solution.fix_function) 
              USING entity_record.id 
              INTO fix_result;
              
              IF fix_result THEN
                fixed_count := fixed_count + 1;
                
                UPDATE detected_errors 
                SET status = 'fixed', 
                    fixed_at = now(), 
                    fix_solution_id = solution.id
                WHERE pattern_id = pattern.id 
                  AND entity_id = entity_record.id 
                  AND status = 'pending';
                
                UPDATE error_solutions 
                SET total_attempts = total_attempts + 1,
                    successful_fixes = successful_fixes + 1,
                    success_rate = (successful_fixes + 1)::numeric / (total_attempts + 1) * 100
                WHERE id = solution.id;
              END IF;
            EXCEPTION WHEN OTHERS THEN
              error_count := error_count + 1;
              
              UPDATE detected_errors 
              SET status = 'failed',
                  fix_details = jsonb_build_object('error', SQLERRM)
              WHERE pattern_id = pattern.id 
                AND entity_id = entity_record.id 
                AND status = 'pending';
                
              UPDATE error_solutions 
              SET total_attempts = total_attempts + 1
              WHERE id = solution.id;
            END;
          END IF;
        END IF;
      END LOOP;
    END IF;
    
    UPDATE error_patterns 
    SET occurrences_count = occurrences_count + found_count,
        last_occurrence_at = CASE WHEN found_count > 0 THEN now() ELSE last_occurrence_at END,
        updated_at = now()
    WHERE id = pattern.id;
    
    pattern_code := pattern.pattern_code;
    entities_found := found_count;
    entities_fixed := fixed_count;
    errors_logged := error_count;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- =====================================================
-- FONCTION FIX FACTURE
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_invoice_for_course(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course RECORD;
  v_devis RECORD;
  v_invoice_number TEXT;
  v_new_invoice_id UUID;
BEGIN
  SELECT * INTO v_course FROM courses WHERE id = p_course_id;
  
  IF v_course IS NULL OR v_course.status != 'completed' THEN
    RETURN false;
  END IF;
  
  IF EXISTS (SELECT 1 FROM factures WHERE course_id = p_course_id) THEN
    RETURN true;
  END IF;
  
  SELECT * INTO v_devis FROM devis 
  WHERE course_id = p_course_id AND status = 'accepted' 
  ORDER BY created_at DESC LIMIT 1;
  
  SELECT 'FAC-' || LPAD(
    (COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1)::text, 
    6, '0'
  ) INTO v_invoice_number
  FROM factures WHERE invoice_number LIKE 'FAC-%';
  
  INSERT INTO factures (
    course_id, client_id, driver_id, devis_id, amount,
    payment_method, payment_status, invoice_number, notes
  ) VALUES (
    p_course_id, v_course.client_id, v_course.driver_id, v_devis.id,
    COALESCE(v_devis.total_price, v_course.final_price, v_course.estimated_price),
    COALESCE(v_course.payment_method, 'pending'), 'pending', v_invoice_number,
    'Facture créée automatiquement par le système self-healing'
  )
  RETURNING id INTO v_new_invoice_id;
  
  INSERT INTO auto_fix_logs (entity_type, entity_id, fix_applied, success, context)
  VALUES ('course', p_course_id, 'auto_create_invoice_for_course', true,
    jsonb_build_object('invoice_id', v_new_invoice_id, 'invoice_number', v_invoice_number));
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO auto_fix_logs (entity_type, entity_id, fix_applied, success, error_message)
  VALUES ('course', p_course_id, 'auto_create_invoice_for_course', false, SQLERRM);
  RETURN false;
END;
$$;

-- =====================================================
-- FONCTION RECALCUL COMMISSION
-- =====================================================

CREATE OR REPLACE FUNCTION auto_calculate_commission(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course RECORD;
  v_commission_rate NUMERIC := 0.10;
  v_commission_amount NUMERIC;
BEGIN
  SELECT * INTO v_course FROM courses WHERE id = p_course_id;
  
  IF v_course IS NULL THEN
    RETURN false;
  END IF;
  
  v_commission_amount := COALESCE(v_course.final_price, v_course.estimated_price, 0) * v_commission_rate;
  
  UPDATE courses 
  SET commission_amount = v_commission_amount, updated_at = now()
  WHERE id = p_course_id;
  
  INSERT INTO auto_fix_logs (entity_type, entity_id, fix_applied, success, context)
  VALUES ('course', p_course_id, 'auto_calculate_commission', true, 
          jsonb_build_object('commission_amount', v_commission_amount));
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO auto_fix_logs (entity_type, entity_id, fix_applied, success, error_message)
  VALUES ('course', p_course_id, 'auto_calculate_commission', false, SQLERRM);
  RETURN false;
END;
$$;

-- =====================================================
-- TRIGGER PRÉVENTION AUTOMATIQUE
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_incomplete_course_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM auto_create_invoice_for_course(NEW.id);
    IF NEW.commission_amount IS NULL THEN
      PERFORM auto_calculate_commission(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_incomplete_course ON courses;
CREATE TRIGGER trg_prevent_incomplete_course
  AFTER UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_incomplete_course_completion();

-- =====================================================
-- FONCTION ENREGISTRER NOUVEAU PATTERN
-- =====================================================

CREATE OR REPLACE FUNCTION register_error_pattern(
  p_pattern_code TEXT,
  p_pattern_name TEXT,
  p_description TEXT,
  p_entity_type TEXT,
  p_detection_query TEXT,
  p_severity TEXT DEFAULT 'medium',
  p_fix_function TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pattern_id UUID;
BEGIN
  INSERT INTO error_patterns (pattern_code, pattern_name, description, entity_type, detection_query, severity)
  VALUES (p_pattern_code, p_pattern_name, p_description, p_entity_type, p_detection_query, p_severity)
  ON CONFLICT (pattern_code) DO UPDATE SET
    pattern_name = EXCLUDED.pattern_name,
    description = EXCLUDED.description,
    detection_query = EXCLUDED.detection_query,
    severity = EXCLUDED.severity,
    updated_at = now()
  RETURNING id INTO v_pattern_id;
  
  IF p_fix_function IS NOT NULL THEN
    INSERT INTO error_solutions (pattern_id, solution_code, solution_name, fix_function)
    VALUES (v_pattern_id, 'AUTO_' || p_pattern_code, 'Fix automatique pour ' || p_pattern_name, p_fix_function)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN v_pattern_id;
END;
$$;

-- =====================================================
-- FONCTION RAPPORT SANTÉ
-- =====================================================

CREATE OR REPLACE FUNCTION get_system_health_report()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report JSONB;
BEGIN
  SELECT jsonb_build_object(
    'timestamp', now(),
    'patterns', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'code', pattern_code,
        'name', pattern_name,
        'severity', severity,
        'occurrences', occurrences_count,
        'last_occurrence', last_occurrence_at,
        'auto_fix_enabled', auto_fix_enabled
      )), '[]'::jsonb)
      FROM error_patterns WHERE is_active = true
    ),
    'recent_errors', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'pattern', ep.pattern_code,
        'entity_type', de.entity_type,
        'entity_id', de.entity_id,
        'status', de.status,
        'detected_at', de.detected_at,
        'fixed_at', de.fixed_at
      )), '[]'::jsonb)
      FROM detected_errors de
      JOIN error_patterns ep ON ep.id = de.pattern_id
      WHERE de.detected_at > now() - INTERVAL '24 hours'
      ORDER BY de.detected_at DESC
      LIMIT 50
    ),
    'solutions_stats', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'solution', solution_name,
        'success_rate', success_rate,
        'total_attempts', total_attempts,
        'successful_fixes', successful_fixes
      )), '[]'::jsonb)
      FROM error_solutions WHERE is_active = true
    ),
    'summary', jsonb_build_object(
      'total_patterns', (SELECT COUNT(*) FROM error_patterns WHERE is_active = true),
      'total_errors_24h', (SELECT COUNT(*) FROM detected_errors WHERE detected_at > now() - INTERVAL '24 hours'),
      'total_fixed_24h', (SELECT COUNT(*) FROM detected_errors WHERE fixed_at > now() - INTERVAL '24 hours'),
      'pending_errors', (SELECT COUNT(*) FROM detected_errors WHERE status = 'pending')
    )
  ) INTO v_report;
  
  INSERT INTO system_health_metrics (metric_name, metric_data)
  VALUES ('health_report', v_report);
  
  RETURN v_report;
END;
$$;

-- =====================================================
-- LIER LES SOLUTIONS AUX PATTERNS
-- =====================================================

INSERT INTO error_solutions (pattern_id, solution_code, solution_name, description, fix_function, priority) 
SELECT p.id, 'AUTO_CREATE_INVOICE', 'Création automatique de facture',
  'Crée automatiquement une facture pour les courses terminées sans facture',
  'auto_create_invoice_for_course', 1
FROM error_patterns p WHERE p.pattern_code = 'MISSING_INVOICE';

INSERT INTO error_solutions (pattern_id, solution_code, solution_name, description, fix_function, priority)
SELECT p.id, 'AUTO_CALCULATE_COMMISSION', 'Recalcul automatique de commission',
  'Recalcule la commission pour les courses terminées',
  'auto_calculate_commission', 1
FROM error_patterns p WHERE p.pattern_code = 'MISSING_COMMISSION';

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view error_patterns" ON error_patterns FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles)));

CREATE POLICY "System can manage error_patterns" ON error_patterns FOR ALL TO service_role USING (true);

CREATE POLICY "Admins can view detected_errors" ON detected_errors FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles)));

CREATE POLICY "System can manage detected_errors" ON detected_errors FOR ALL TO service_role USING (true);

CREATE POLICY "All authenticated view solutions" ON error_solutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated view validation_rules" ON validation_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated view entity_dependencies" ON entity_dependencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "All authenticated view system_health_metrics" ON system_health_metrics FOR SELECT TO authenticated USING (true);

-- =====================================================
-- INDEX PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_detected_errors_status ON detected_errors(status);
CREATE INDEX IF NOT EXISTS idx_detected_errors_pattern ON detected_errors(pattern_id);
CREATE INDEX IF NOT EXISTS idx_detected_errors_entity ON detected_errors(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_error_patterns_active ON error_patterns(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_error_solutions_pattern ON error_solutions(pattern_id);
