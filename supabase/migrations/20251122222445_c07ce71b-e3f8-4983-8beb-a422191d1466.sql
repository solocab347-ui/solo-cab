-- Créer une table pour les templates d'emails
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Créer une table pour l'historique des envois d'emails
CREATE TABLE IF NOT EXISTS public.email_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  content text NOT NULL,
  recipient_type text NOT NULL, -- 'all_drivers', 'all_clients', 'specific_drivers', 'specific_clients'
  recipient_ids uuid[] DEFAULT ARRAY[]::uuid[],
  recipients_count integer NOT NULL DEFAULT 0,
  sent_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Activer RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;

-- Policies pour email_templates
CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policies pour email_history
CREATE POLICY "Admins can view email history"
ON public.email_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert email history"
ON public.email_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Ajouter des commentaires
COMMENT ON TABLE public.email_templates IS 'Modèles d''emails réutilisables pour l''admin';
COMMENT ON TABLE public.email_history IS 'Historique des envois d''emails en masse par l''admin';

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON public.email_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON public.email_templates(name);