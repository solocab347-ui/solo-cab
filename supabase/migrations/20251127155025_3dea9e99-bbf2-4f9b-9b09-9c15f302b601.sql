-- Créer une table pour stocker les liens des réseaux sociaux
CREATE TABLE IF NOT EXISTS public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL UNIQUE,
  url text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut voir les liens actifs
CREATE POLICY "Anyone can view active social links"
ON public.social_links
FOR SELECT
USING (is_active = true);

-- Politique: Seuls les admins peuvent gérer les liens
CREATE POLICY "Admins can manage social links"
ON public.social_links
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insérer les plateformes par défaut
INSERT INTO public.social_links (platform, url, display_order, is_active) VALUES
  ('facebook', null, 1, false),
  ('linkedin', null, 2, false),
  ('instagram', null, 3, false)
ON CONFLICT (platform) DO NOTHING;

-- Trigger pour updated_at
CREATE TRIGGER update_social_links_updated_at
  BEFORE UPDATE ON public.social_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();