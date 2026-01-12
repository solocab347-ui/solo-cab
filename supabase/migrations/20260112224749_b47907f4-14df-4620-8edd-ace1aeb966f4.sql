-- Table pour les paramètres système
CREATE TABLE public.system_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Activer RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Lecture publique (pour le formulaire d'inscription)
CREATE POLICY "Lecture publique des paramètres" 
ON public.system_settings 
FOR SELECT 
USING (true);

-- Modification par admins uniquement
CREATE POLICY "Admins peuvent modifier les paramètres" 
ON public.system_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insérer le paramètre pour l'adresse d'expédition NFC
INSERT INTO public.system_settings (id, value, description)
VALUES (
  'nfc_require_shipping_address',
  '{"enabled": false}'::jsonb,
  'Quand activé, demande l''adresse d''expédition dans le formulaire d''inscription chauffeur pour envoyer les plaques NFC par la poste'
);

-- Ajouter colonne adresse expédition dans drivers
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS shipping_city TEXT,
ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT,
ADD COLUMN IF NOT EXISTS shipping_country TEXT DEFAULT 'France';