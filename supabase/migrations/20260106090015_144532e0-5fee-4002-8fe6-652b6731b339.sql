-- Table pour les administrateurs d'entreprise (multi-comptes)
CREATE TABLE public.company_administrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'owner')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- Table pour les invitations d'administrateurs
CREATE TABLE public.company_admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.company_administrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_admin_invitations ENABLE ROW LEVEL SECURITY;

-- Fonction pour vérifier si un utilisateur est admin d'une entreprise
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_administrators
    WHERE user_id = _user_id 
    AND company_id = _company_id 
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = _company_id
    AND user_id = _user_id
  )
$$;

-- Fonction pour récupérer l'ID d'entreprise d'un admin
CREATE OR REPLACE FUNCTION public.get_admin_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT company_id FROM public.company_administrators WHERE user_id = _user_id AND is_active = true LIMIT 1),
    (SELECT id FROM public.companies WHERE user_id = _user_id LIMIT 1)
  )
$$;

-- Policies pour company_administrators
CREATE POLICY "Admins can view their company admins"
ON public.company_administrators FOR SELECT
TO authenticated
USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Company owner can manage admins"
ON public.company_administrators FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
);

-- Policies pour company_admin_invitations
CREATE POLICY "Admins can view their company invitations"
ON public.company_admin_invitations FOR SELECT
TO authenticated
USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can create invitations"
ON public.company_admin_invitations FOR INSERT
TO authenticated
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can delete invitations"
ON public.company_admin_invitations FOR DELETE
TO authenticated
USING (public.is_company_admin(auth.uid(), company_id));

-- Policy publique pour valider une invitation via token
CREATE POLICY "Anyone can view invitation by token"
ON public.company_admin_invitations FOR SELECT
TO authenticated
USING (true);

-- Trigger pour updated_at
CREATE TRIGGER update_company_administrators_updated_at
BEFORE UPDATE ON public.company_administrators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour performances
CREATE INDEX idx_company_administrators_company_id ON public.company_administrators(company_id);
CREATE INDEX idx_company_administrators_user_id ON public.company_administrators(user_id);
CREATE INDEX idx_company_admin_invitations_token ON public.company_admin_invitations(token);
CREATE INDEX idx_company_admin_invitations_company_id ON public.company_admin_invitations(company_id);