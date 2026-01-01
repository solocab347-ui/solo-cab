-- Table pour les rapports d'erreurs utilisateurs
CREATE TABLE public.error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT, -- 'client', 'driver', 'fleet_manager', 'company', 'admin', 'anonymous'
  user_email TEXT,
  user_name TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  page_url TEXT,
  page_route TEXT,
  user_agent TEXT,
  screen_size TEXT,
  browser_info TEXT,
  additional_context JSONB DEFAULT '{}',
  status TEXT DEFAULT 'new', -- 'new', 'in_progress', 'resolved', 'ignored'
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour la recherche rapide
CREATE INDEX idx_error_reports_status ON public.error_reports(status);
CREATE INDEX idx_error_reports_created_at ON public.error_reports(created_at DESC);
CREATE INDEX idx_error_reports_user_id ON public.error_reports(user_id);

-- Enable RLS
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- Politique: tout utilisateur authentifié peut créer un rapport
CREATE POLICY "Users can create error reports"
ON public.error_reports
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Politique: utilisateurs anonymes peuvent créer des rapports (via API)
CREATE POLICY "Anonymous users can create error reports"
ON public.error_reports
FOR INSERT
TO anon
WITH CHECK (true);

-- Politique: seuls les admins peuvent voir et modifier les rapports
CREATE POLICY "Admins can view all error reports"
ON public.error_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update error reports"
ON public.error_reports
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_error_reports_updated_at
BEFORE UPDATE ON public.error_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();