-- Table pour stocker les patterns d'erreurs et leurs solutions automatiques
CREATE TABLE public.error_learnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL,
  error_pattern TEXT NOT NULL,
  description TEXT NOT NULL,
  auto_fix_enabled BOOLEAN DEFAULT true,
  auto_fix_function TEXT,
  occurrences INTEGER DEFAULT 0,
  last_occurrence_at TIMESTAMP WITH TIME ZONE,
  first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  fix_success_count INTEGER DEFAULT 0,
  fix_failure_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour logger les auto-corrections appliquées
CREATE TABLE public.auto_fix_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learning_id UUID REFERENCES public.error_learnings(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  fix_applied TEXT NOT NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour les vérifications de santé automatiques
CREATE TABLE public.health_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_name TEXT NOT NULL,
  check_type TEXT NOT NULL,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  interval_minutes INTEGER DEFAULT 60,
  is_enabled BOOLEAN DEFAULT true,
  last_issues_found INTEGER DEFAULT 0,
  last_issues_fixed INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  total_fixes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_error_learnings_type ON public.error_learnings(error_type);
CREATE INDEX idx_error_learnings_active ON public.error_learnings(is_active, auto_fix_enabled);
CREATE INDEX idx_auto_fix_logs_entity ON public.auto_fix_logs(entity_type, entity_id);
CREATE INDEX idx_health_checks_next_run ON public.health_checks(next_run_at, is_enabled);

-- Trigger pour updated_at
CREATE TRIGGER update_error_learnings_updated_at
BEFORE UPDATE ON public.error_learnings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.error_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_fix_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

-- Policies pour admin seulement
CREATE POLICY "Admins can manage error_learnings" ON public.error_learnings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view auto_fix_logs" ON public.auto_fix_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert auto_fix_logs" ON public.auto_fix_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage health_checks" ON public.health_checks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Insérer le premier apprentissage: factures manquantes
INSERT INTO public.error_learnings (error_type, error_pattern, description, auto_fix_function) VALUES
('MISSING_INVOICE', 'course.status=completed AND facture IS NULL', 'Course terminée sans facture générée', 'auto_create_missing_invoice'),
('MISSING_DEVIS', 'course.status=pending AND devis IS NULL', 'Course sans devis associé', 'auto_create_missing_devis'),
('ORPHAN_COURSE', 'course.client_id IS NULL AND course.driver_id IS NULL', 'Course sans client ni chauffeur', 'flag_orphan_course'),
('DUPLICATE_INVOICE', 'COUNT(factures) > 1 FOR course_id', 'Plusieurs factures pour la même course', 'flag_duplicate_invoice');

-- Insérer les health checks automatiques
INSERT INTO public.health_checks (check_name, check_type, interval_minutes) VALUES
('missing_invoices_check', 'invoice_integrity', 30),
('orphan_courses_check', 'data_integrity', 60),
('duplicate_detection', 'data_integrity', 120);

-- Fonction pour créer automatiquement les factures manquantes
CREATE OR REPLACE FUNCTION public.auto_create_missing_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fixed_count INTEGER := 0;
  course_record RECORD;
  new_invoice_number TEXT;
BEGIN
  -- Trouver toutes les courses terminées sans facture
  FOR course_record IN
    SELECT c.id as course_id, c.client_id, c.driver_id, d.id as devis_id, d.total_price
    FROM courses c
    LEFT JOIN factures f ON f.course_id = c.id
    LEFT JOIN devis d ON d.course_id = c.id AND d.status = 'accepted'
    WHERE c.status = 'completed'
    AND f.id IS NULL
    AND d.id IS NOT NULL
  LOOP
    -- Générer le numéro de facture
    SELECT 'FAC-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1)::text, 6, '0')
    INTO new_invoice_number
    FROM factures
    WHERE invoice_number LIKE 'FAC-%';

    -- Créer la facture
    INSERT INTO factures (course_id, client_id, driver_id, devis_id, amount, payment_method, payment_status, invoice_number)
    VALUES (course_record.course_id, course_record.client_id, course_record.driver_id, course_record.devis_id, 
            course_record.total_price, 'pending', 'pending', new_invoice_number);

    -- Logger la correction
    INSERT INTO auto_fix_logs (learning_id, entity_type, entity_id, fix_applied, success, context)
    SELECT el.id, 'course', course_record.course_id::text, 'Created invoice ' || new_invoice_number, true,
           jsonb_build_object('driver_id', course_record.driver_id, 'amount', course_record.total_price)
    FROM error_learnings el WHERE el.error_type = 'MISSING_INVOICE';

    fixed_count := fixed_count + 1;
  END LOOP;

  -- Mettre à jour les statistiques du learning
  UPDATE error_learnings 
  SET occurrences = occurrences + fixed_count,
      fix_success_count = fix_success_count + fixed_count,
      last_occurrence_at = CASE WHEN fixed_count > 0 THEN now() ELSE last_occurrence_at END
  WHERE error_type = 'MISSING_INVOICE';

  RETURN fixed_count;
END;
$$;

-- Fonction pour exécuter tous les health checks
CREATE OR REPLACE FUNCTION public.run_health_checks()
RETURNS TABLE(check_name TEXT, issues_found INTEGER, issues_fixed INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  check_record RECORD;
  result_issues INTEGER;
  result_fixed INTEGER;
BEGIN
  FOR check_record IN
    SELECT * FROM health_checks WHERE is_enabled = true
  LOOP
    result_issues := 0;
    result_fixed := 0;

    IF check_record.check_name = 'missing_invoices_check' THEN
      SELECT auto_create_missing_invoices() INTO result_fixed;
      result_issues := result_fixed;
    END IF;

    -- Mettre à jour le health check
    UPDATE health_checks
    SET last_run_at = now(),
        next_run_at = now() + (interval_minutes || ' minutes')::interval,
        last_issues_found = result_issues,
        last_issues_fixed = result_fixed,
        total_runs = total_runs + 1,
        total_fixes = total_fixes + result_fixed
    WHERE id = check_record.id;

    check_name := check_record.check_name;
    issues_found := result_issues;
    issues_fixed := result_fixed;
    RETURN NEXT;
  END LOOP;
END;
$$;