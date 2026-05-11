-- ============================================================
-- VAGUE 1 — Security Governance Foundation
-- ============================================================

-- 1. Table d'audit des actions sensibles (admin-only)
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  target_user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sec_audit_actor ON public.security_audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_target ON public.security_audit_log(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sec_audit_action ON public.security_audit_log(action, created_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Lecture : admin uniquement
DROP POLICY IF EXISTS "security_audit_admin_read" ON public.security_audit_log;
CREATE POLICY "security_audit_admin_read"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Aucune policy INSERT/UPDATE/DELETE → écriture serveur uniquement (service_role / triggers SECURITY DEFINER)

COMMENT ON TABLE public.security_audit_log IS
  'Journal des actions sensibles (changements de rôle, accès admin, etc.). Lecture admin uniquement, écriture serveur exclusivement.';

-- 2. Fonction d'audit posture sécurité (admin-only)
CREATE OR REPLACE FUNCTION public.audit_security_posture()
RETURNS TABLE(
  category TEXT,
  severity TEXT,
  object_name TEXT,
  finding TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  -- A. Tables publiques sans RLS activée
  RETURN QUERY
  SELECT
    'rls_disabled'::TEXT,
    'critical'::TEXT,
    (n.nspname || '.' || c.relname)::TEXT,
    'Table sans RLS — exposée à anon/authenticated'::TEXT
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = false;

  -- B. Tables avec RLS mais sans aucune policy (deny-all = OK, mais souvent oubli)
  RETURN QUERY
  SELECT
    'no_policies'::TEXT,
    'medium'::TEXT,
    (n.nspname || '.' || c.relname)::TEXT,
    'RLS active mais aucune policy → table inaccessible (vérifier intentionnel)'::TEXT
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND NOT EXISTS (
      SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
    );

  -- C. Fonctions SECURITY DEFINER sans search_path verrouillé
  RETURN QUERY
  SELECT
    'function_search_path'::TEXT,
    'high'::TEXT,
    (n.nspname || '.' || p.proname)::TEXT,
    'Fonction SECURITY DEFINER sans SET search_path → risque path hijacking'::TEXT
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) cfg
      WHERE cfg LIKE 'search_path=%'
    );

  -- D. Vues sans security_invoker (héritent des droits du créateur = bypass RLS)
  RETURN QUERY
  SELECT
    'view_security_invoker'::TEXT,
    'high'::TEXT,
    (n.nspname || '.' || c.relname)::TEXT,
    'Vue sans security_invoker=on → bypass RLS possible'::TEXT
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'v'
    AND NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(c.reloptions, '{}'::text[])) opt
      WHERE opt = 'security_invoker=true' OR opt = 'security_invoker=on'
    );

  -- E. Policies trop permissives (USING true)
  RETURN QUERY
  SELECT
    'policy_permissive'::TEXT,
    'high'::TEXT,
    (schemaname || '.' || tablename || ' / ' || policyname)::TEXT,
    'Policy avec USING true → accès non restreint'::TEXT
  FROM pg_policies
  WHERE schemaname = 'public'
    AND qual = 'true'
    AND tablename NOT IN ('app_config'); -- exceptions documentées
END;
$$;

REVOKE ALL ON FUNCTION public.audit_security_posture() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_security_posture() TO authenticated;

COMMENT ON FUNCTION public.audit_security_posture() IS
  'Scan automatique de la posture sécurité (RLS, search_path, security_invoker, policies permissives). Admin uniquement.';

-- 3. Trigger d'audit sur user_roles (toute attribution / retrait de rôle est loggué)
CREATE OR REPLACE FUNCTION public.audit_user_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_audit_log(actor_user_id, target_user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), NEW.user_id, 'role_granted', 'user_role', NEW.id::text,
            jsonb_build_object('role', NEW.role));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_audit_log(actor_user_id, target_user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), OLD.user_id, 'role_revoked', 'user_role', OLD.id::text,
            jsonb_build_object('role', OLD.role));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_audit_log(actor_user_id, target_user_id, action, entity_type, entity_id, details)
    VALUES (auth.uid(), NEW.user_id, 'role_updated', 'user_role', NEW.id::text,
            jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_role_change ON public.user_roles;
CREATE TRIGGER trg_audit_user_role_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_change();

COMMENT ON TRIGGER trg_audit_user_role_change ON public.user_roles IS
  'Logge toute attribution / modification / retrait de rôle dans security_audit_log.';
