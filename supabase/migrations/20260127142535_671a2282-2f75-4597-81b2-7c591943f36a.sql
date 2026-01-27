-- ============================================
-- SYSTÈME D'APPRENTISSAGE INTELLIGENT DES ERREURS V2 (CORRIGÉ)
-- ============================================

-- 1. Améliorer la table error_patterns avec plus de contexte
ALTER TABLE public.error_patterns 
ADD COLUMN IF NOT EXISTS fingerprint TEXT,
ADD COLUMN IF NOT EXISTS context_keys TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS learning_confidence NUMERIC(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS auto_escalate_threshold INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS last_auto_fix_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ;

-- 2. Améliorer la table error_solutions avec métriques d'apprentissage
ALTER TABLE public.error_solutions
ADD COLUMN IF NOT EXISTS failed_fixes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_fix_duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requires_validation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS rollback_query TEXT,
ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}';

-- 3. Table pour tracker les occurrences d'erreurs en temps réel
CREATE TABLE IF NOT EXISTS public.error_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID REFERENCES public.error_patterns(id) ON DELETE CASCADE,
  error_fingerprint TEXT NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  entity_type TEXT,
  entity_id TEXT,
  user_id UUID,
  context JSONB DEFAULT '{}',
  browser_info JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT now(),
  was_auto_fixed BOOLEAN DEFAULT false,
  fix_attempted_at TIMESTAMPTZ,
  fix_successful BOOLEAN,
  fix_duration_ms INTEGER,
  solution_id UUID REFERENCES public.error_solutions(id)
);

-- 4. Table pour les règles d'apprentissage automatique
CREATE TABLE IF NOT EXISTS public.error_learning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_code TEXT UNIQUE NOT NULL,
  description TEXT,
  trigger_condition JSONB NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('auto_fix', 'alert', 'escalate', 'disable_feature', 'rollback', 'retry')),
  action_config JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  times_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  success_rate NUMERIC(5,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Table pour les alertes intelligentes
CREATE TABLE IF NOT EXISTS public.error_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID REFERENCES public.error_patterns(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('critical', 'warning', 'info', 'learning')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  occurrences_count INTEGER DEFAULT 1,
  first_occurrence_at TIMESTAMPTZ DEFAULT now(),
  last_occurrence_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  auto_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Table pour les corrections manuelles (pour apprentissage)
CREATE TABLE IF NOT EXISTS public.manual_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_occurrence_id UUID REFERENCES public.error_occurrences(id),
  pattern_id UUID REFERENCES public.error_patterns(id),
  fixed_by UUID,
  fix_description TEXT NOT NULL,
  fix_steps JSONB DEFAULT '[]',
  fix_code TEXT,
  was_successful BOOLEAN DEFAULT true,
  should_auto_fix BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Vue pour les métriques d'apprentissage
CREATE OR REPLACE VIEW public.error_learning_metrics AS
SELECT 
  p.id AS pattern_id,
  p.pattern_code,
  p.pattern_name,
  p.severity,
  p.occurrences_count,
  p.learning_confidence,
  COALESCE(
    (SELECT COUNT(*) FROM public.error_occurrences eo WHERE eo.pattern_id = p.id AND eo.was_auto_fixed = true),
    0
  ) AS auto_fixed_count,
  COALESCE(
    (SELECT COUNT(*) FROM public.error_occurrences eo WHERE eo.pattern_id = p.id AND eo.fix_successful = true),
    0
  ) AS successful_fixes,
  COALESCE(
    (SELECT COUNT(*) FROM public.manual_fixes mf WHERE mf.pattern_id = p.id),
    0
  ) AS manual_fixes_count,
  COALESCE(
    (SELECT AVG(fix_duration_ms) FROM public.error_occurrences eo WHERE eo.pattern_id = p.id AND eo.fix_successful = true),
    0
  )::INTEGER AS avg_fix_duration_ms,
  p.auto_fix_enabled,
  p.is_active,
  p.last_auto_fix_at,
  p.consecutive_failures
FROM public.error_patterns p
WHERE p.is_active = true;

-- 8. Fonction pour enregistrer une erreur et déclencher l'apprentissage
CREATE OR REPLACE FUNCTION public.log_error_with_learning(
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_context JSONB DEFAULT '{}',
  p_browser_info JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  v_fingerprint TEXT;
  v_pattern_id UUID;
  v_occurrence_id UUID;
  v_should_auto_fix BOOLEAN := false;
  v_solution_id UUID;
  v_result JSONB;
BEGIN
  -- Générer un fingerprint basé sur le message d'erreur
  v_fingerprint := md5(COALESCE(p_entity_type, '') || ':' || LEFT(p_error_message, 100));
  
  -- Chercher un pattern existant
  SELECT id, auto_fix_enabled INTO v_pattern_id, v_should_auto_fix
  FROM public.error_patterns
  WHERE fingerprint = v_fingerprint
    AND is_active = true
    AND (cooldown_until IS NULL OR cooldown_until < now())
  LIMIT 1;
  
  -- Si pattern trouvé, mettre à jour les stats
  IF v_pattern_id IS NOT NULL THEN
    UPDATE public.error_patterns
    SET 
      occurrences_count = occurrences_count + 1,
      last_occurrence_at = now()
    WHERE id = v_pattern_id;
  ELSE
    -- Créer un nouveau pattern
    INSERT INTO public.error_patterns (
      pattern_code,
      pattern_name,
      description,
      fingerprint,
      entity_type,
      severity,
      occurrences_count
    ) VALUES (
      'AUTO_' || UPPER(REPLACE(LEFT(p_error_message, 30), ' ', '_')),
      LEFT(p_error_message, 100),
      'Auto-detected error pattern',
      v_fingerprint,
      p_entity_type,
      'medium',
      1
    )
    RETURNING id INTO v_pattern_id;
  END IF;
  
  -- Enregistrer l'occurrence
  INSERT INTO public.error_occurrences (
    pattern_id,
    error_fingerprint,
    error_message,
    error_stack,
    entity_type,
    entity_id,
    user_id,
    context,
    browser_info
  ) VALUES (
    v_pattern_id,
    v_fingerprint,
    p_error_message,
    p_error_stack,
    p_entity_type,
    p_entity_id,
    p_user_id,
    p_context,
    p_browser_info
  )
  RETURNING id INTO v_occurrence_id;
  
  -- Chercher une solution applicable
  IF v_should_auto_fix THEN
    SELECT id INTO v_solution_id
    FROM public.error_solutions
    WHERE pattern_id = v_pattern_id
      AND is_active = true
      AND (success_rate IS NULL OR success_rate > 0.5)
    ORDER BY priority DESC, success_rate DESC NULLS LAST
    LIMIT 1;
  END IF;
  
  -- Vérifier si on doit créer une alerte
  PERFORM 1 FROM public.error_patterns
  WHERE id = v_pattern_id
    AND occurrences_count >= auto_escalate_threshold
    AND NOT EXISTS (
      SELECT 1 FROM public.error_alerts
      WHERE pattern_id = v_pattern_id
        AND resolved_at IS NULL
    );
  
  IF FOUND THEN
    INSERT INTO public.error_alerts (
      pattern_id,
      alert_type,
      title,
      message,
      context
    ) VALUES (
      v_pattern_id,
      CASE 
        WHEN (SELECT severity FROM public.error_patterns WHERE id = v_pattern_id) = 'critical' THEN 'critical'
        ELSE 'warning'
      END,
      'Erreur récurrente détectée',
      p_error_message,
      p_context
    );
  END IF;
  
  v_result := jsonb_build_object(
    'occurrence_id', v_occurrence_id,
    'pattern_id', v_pattern_id,
    'should_auto_fix', v_should_auto_fix,
    'solution_id', v_solution_id
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Fonction pour enregistrer le résultat d'une correction
CREATE OR REPLACE FUNCTION public.log_fix_result(
  p_occurrence_id UUID,
  p_solution_id UUID,
  p_was_successful BOOLEAN,
  p_duration_ms INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_pattern_id UUID;
BEGIN
  -- Mettre à jour l'occurrence
  UPDATE public.error_occurrences
  SET 
    was_auto_fixed = true,
    fix_attempted_at = now(),
    fix_successful = p_was_successful,
    fix_duration_ms = p_duration_ms,
    solution_id = p_solution_id
  WHERE id = p_occurrence_id
  RETURNING pattern_id INTO v_pattern_id;
  
  -- Mettre à jour les stats de la solution
  UPDATE public.error_solutions
  SET
    total_attempts = COALESCE(total_attempts, 0) + 1,
    successful_fixes = CASE WHEN p_was_successful THEN COALESCE(successful_fixes, 0) + 1 ELSE COALESCE(successful_fixes, 0) END,
    failed_fixes = CASE WHEN NOT p_was_successful THEN COALESCE(failed_fixes, 0) + 1 ELSE COALESCE(failed_fixes, 0) END,
    success_rate = (COALESCE(successful_fixes, 0) + CASE WHEN p_was_successful THEN 1 ELSE 0 END)::NUMERIC / 
                   (COALESCE(total_attempts, 0) + 1),
    avg_fix_duration_ms = CASE 
      WHEN p_duration_ms IS NOT NULL THEN 
        (COALESCE(avg_fix_duration_ms, 0) * COALESCE(total_attempts, 0) + p_duration_ms) / (COALESCE(total_attempts, 0) + 1)
      ELSE avg_fix_duration_ms
    END,
    last_success_at = CASE WHEN p_was_successful THEN now() ELSE last_success_at END,
    last_failure_at = CASE WHEN NOT p_was_successful THEN now() ELSE last_failure_at END,
    updated_at = now()
  WHERE id = p_solution_id;
  
  -- Mettre à jour les stats du pattern
  IF v_pattern_id IS NOT NULL THEN
    UPDATE public.error_patterns
    SET
      consecutive_failures = CASE WHEN p_was_successful THEN 0 ELSE consecutive_failures + 1 END,
      last_auto_fix_at = now(),
      learning_confidence = CASE 
        WHEN p_was_successful THEN LEAST(learning_confidence + 0.1, 1.0)
        ELSE GREATEST(learning_confidence - 0.2, 0.0)
      END,
      cooldown_until = CASE 
        WHEN NOT p_was_successful AND consecutive_failures >= 3 THEN now() + INTERVAL '1 hour'
        ELSE cooldown_until
      END,
      updated_at = now()
    WHERE id = v_pattern_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Fonction pour apprendre d'une correction manuelle
CREATE OR REPLACE FUNCTION public.learn_from_manual_fix(
  p_pattern_id UUID,
  p_fix_description TEXT,
  p_fix_steps JSONB DEFAULT '[]',
  p_fix_code TEXT DEFAULT NULL,
  p_should_auto_fix BOOLEAN DEFAULT false,
  p_fixed_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_solution_id UUID;
  v_pattern_code TEXT;
BEGIN
  SELECT pattern_code INTO v_pattern_code
  FROM public.error_patterns
  WHERE id = p_pattern_id;
  
  INSERT INTO public.error_solutions (
    pattern_id,
    solution_code,
    solution_name,
    description,
    fix_function,
    priority,
    is_active
  ) VALUES (
    p_pattern_id,
    'LEARNED_' || v_pattern_code,
    p_fix_description,
    'Solution apprise automatiquement',
    p_fix_code,
    75,
    p_should_auto_fix
  )
  ON CONFLICT (solution_code) DO UPDATE
  SET
    description = EXCLUDED.description,
    fix_function = EXCLUDED.fix_function,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING id INTO v_solution_id;
  
  INSERT INTO public.manual_fixes (
    pattern_id,
    fixed_by,
    fix_description,
    fix_steps,
    fix_code,
    should_auto_fix
  ) VALUES (
    p_pattern_id,
    p_fixed_by,
    p_fix_description,
    p_fix_steps,
    p_fix_code,
    p_should_auto_fix
  );
  
  UPDATE public.error_patterns
  SET
    learning_confidence = LEAST(learning_confidence + 0.15, 1.0),
    auto_fix_enabled = CASE WHEN p_should_auto_fix AND learning_confidence >= 0.7 THEN true ELSE auto_fix_enabled END,
    updated_at = now()
  WHERE id = p_pattern_id;
  
  RETURN v_solution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Activer RLS
ALTER TABLE public.error_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_learning_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_fixes ENABLE ROW LEVEL SECURITY;

-- 12. Policies pour les admins (corrigé: roles au lieu de role)
CREATE POLICY "Admins can manage error_occurrences"
ON public.error_occurrences
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

CREATE POLICY "Admins can manage error_learning_rules"
ON public.error_learning_rules
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

CREATE POLICY "Admins can manage error_alerts"
ON public.error_alerts
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

CREATE POLICY "Admins can manage manual_fixes"
ON public.manual_fixes
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

-- 13. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_error_occurrences_pattern ON public.error_occurrences(pattern_id);
CREATE INDEX IF NOT EXISTS idx_error_occurrences_fingerprint ON public.error_occurrences(error_fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_occurrences_occurred_at ON public.error_occurrences(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_alerts_unresolved ON public.error_alerts(pattern_id) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_error_patterns_fingerprint ON public.error_patterns(fingerprint);

-- 14. Insérer des règles d'apprentissage par défaut
INSERT INTO public.error_learning_rules (rule_code, rule_name, description, trigger_condition, action_type, action_config, priority)
VALUES 
  ('RETRY_NETWORK_ERRORS', 'Retry sur erreurs réseau', 'Réessayer automatiquement les erreurs réseau temporaires', 
   '{"error_contains": ["network", "fetch", "timeout", "ECONNRESET"]}', 'retry', '{"max_attempts": 3, "delay_ms": 1000}', 90),
  ('ALERT_CRITICAL_5X', 'Alerte erreurs critiques x5', 'Alerter quand une erreur critique survient 5 fois', 
   '{"severity": "critical", "occurrences_threshold": 5}', 'alert', '{"alert_type": "critical"}', 100),
  ('AUTO_FIX_MISSING_INVOICE', 'Auto-création factures manquantes', 'Créer automatiquement les factures pour courses terminées', 
   '{"pattern_code": "MISSING_INVOICE"}', 'auto_fix', '{"function": "auto_create_missing_invoice"}', 80),
  ('DISABLE_ON_FAILURE', 'Désactiver feature en échec', 'Désactiver temporairement une fonctionnalité après 10 échecs', 
   '{"consecutive_failures": 10}', 'disable_feature', '{"cooldown_hours": 2}', 70),
  ('ESCALATE_PAYMENT_ERRORS', 'Escalader erreurs paiement', 'Escalader immédiatement les erreurs de paiement', 
   '{"error_contains": ["payment", "stripe", "transaction"], "severity": "critical"}', 'escalate', '{"notify_admin": true}', 95)
ON CONFLICT (rule_code) DO NOTHING;