-- ============================================
-- SYSTÈME DE SÉCURITÉ COMPLET POUR SOLOCAB
-- Protection contre DDoS, Bot, Spam et Attaques
-- ============================================

-- Table d'audit des actions de sécurité
CREATE TABLE public.security_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'failed_login', 'suspicious_activity', 'rate_limit', 'blocked_request', 'admin_action'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  request_path TEXT,
  request_method TEXT,
  risk_score INTEGER DEFAULT 0, -- 0-100, plus c'est élevé plus c'est suspect
  details JSONB DEFAULT '{}'::jsonb,
  country_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherches rapides
CREATE INDEX idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX idx_security_audit_logs_event_type ON public.security_audit_logs(event_type);
CREATE INDEX idx_security_audit_logs_created_at ON public.security_audit_logs(created_at DESC);
CREATE INDEX idx_security_audit_logs_ip_address ON public.security_audit_logs(ip_address);
CREATE INDEX idx_security_audit_logs_risk_score ON public.security_audit_logs(risk_score DESC);

-- Enable RLS
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view security logs"
ON public.security_audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Table des IP bloquées dynamiquement
CREATE TABLE public.blocked_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_by UUID REFERENCES auth.users(id),
  is_permanent BOOLEAN DEFAULT false,
  block_count INTEGER DEFAULT 1,
  first_blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  last_offense_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocked_ips_ip_address ON public.blocked_ips(ip_address);
CREATE INDEX idx_blocked_ips_blocked_until ON public.blocked_ips(blocked_until);

-- Enable RLS
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blocked IPs
CREATE POLICY "Admins can view blocked IPs"
ON public.blocked_ips FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can insert blocked IPs"
ON public.blocked_ips FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update blocked IPs"
ON public.blocked_ips FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can delete blocked IPs"
ON public.blocked_ips FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Table pour les fingerprints suspects
CREATE TABLE public.suspicious_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint_hash TEXT NOT NULL,
  user_agent TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  platform TEXT,
  associated_ips TEXT[] DEFAULT ARRAY[]::TEXT[],
  associated_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  risk_score INTEGER DEFAULT 0,
  flags TEXT[] DEFAULT ARRAY[]::TEXT[], -- 'multiple_accounts', 'bot_detected', 'automation_tools', 'vpn_detected'
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_blocked BOOLEAN DEFAULT false,
  notes TEXT
);

CREATE INDEX idx_suspicious_fingerprints_hash ON public.suspicious_fingerprints(fingerprint_hash);
CREATE INDEX idx_suspicious_fingerprints_risk_score ON public.suspicious_fingerprints(risk_score DESC);

ALTER TABLE public.suspicious_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view suspicious fingerprints"
ON public.suspicious_fingerprints FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage suspicious fingerprints"
ON public.suspicious_fingerprints FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Table des alertes de sécurité pour les admins
CREATE TABLE public.security_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'ddos_attempt', 'brute_force', 'suspicious_signup', 'data_exfiltration', 'bot_activity', 'unusual_pattern'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT,
  affected_entity_type TEXT, -- 'user', 'ip', 'endpoint', 'system'
  affected_entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_alerts_severity ON public.security_alerts(severity);
CREATE INDEX idx_security_alerts_created_at ON public.security_alerts(created_at DESC);
CREATE INDEX idx_security_alerts_is_resolved ON public.security_alerts(is_resolved);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security alerts"
ON public.security_alerts FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update security alerts"
ON public.security_alerts FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Table rate limiting persistant (pour backup du in-memory)
CREATE TABLE public.rate_limit_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- 'ip:xxx' ou 'user:xxx'
  endpoint TEXT,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_blocked BOOLEAN DEFAULT false,
  block_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_rate_limit_identifier_endpoint ON public.rate_limit_records(identifier, endpoint);
CREATE INDEX idx_rate_limit_is_blocked ON public.rate_limit_records(is_blocked);

ALTER TABLE public.rate_limit_records ENABLE ROW LEVEL SECURITY;

-- No direct access - only via service role
CREATE POLICY "No public access to rate limit records"
ON public.rate_limit_records FOR ALL
USING (false);

-- Fonction pour nettoyer les anciens logs de sécurité
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Supprimer les logs de plus de 90 jours
  DELETE FROM public.security_audit_logs
  WHERE created_at < now() - interval '90 days';
  
  -- Supprimer les IPs temporairement bloquées expirées
  DELETE FROM public.blocked_ips
  WHERE is_permanent = false 
  AND blocked_until < now();
  
  -- Supprimer les rate limit records expirés
  DELETE FROM public.rate_limit_records
  WHERE updated_at < now() - interval '1 hour';
END;
$$;

-- Fonction pour vérifier si une IP est bloquée
CREATE OR REPLACE FUNCTION public.is_ip_blocked(check_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocked_ips
    WHERE ip_address = check_ip
    AND (is_permanent = true OR blocked_until > now())
  );
END;
$$;

-- Fonction pour créer une alerte de sécurité
CREATE OR REPLACE FUNCTION public.create_security_alert(
  p_alert_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_affected_entity_type TEXT DEFAULT NULL,
  p_affected_entity_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.security_alerts (
    alert_type, severity, title, description,
    affected_entity_type, affected_entity_id, metadata
  )
  VALUES (
    p_alert_type, p_severity, p_title, p_description,
    p_affected_entity_type, p_affected_entity_id, p_metadata
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Enable realtime for security alerts (admins need instant notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_alerts;