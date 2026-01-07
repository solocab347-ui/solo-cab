-- Table pour gérer les liens d'invitation congrès
CREATE TABLE public.congress_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  max_uses INTEGER NOT NULL DEFAULT 350,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  discount_percentage DECIMAL(5,2) DEFAULT 20.00,
  trial_days INTEGER DEFAULT 30,
  monthly_price DECIMAL(10,2) DEFAULT 39.99,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Table pour tracker les inscriptions via congrès
CREATE TABLE public.congress_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invitation_id UUID NOT NULL REFERENCES public.congress_invitations(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  nfc_tag_number TEXT,
  registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_status TEXT DEFAULT 'trial',
  notes TEXT,
  UNIQUE(driver_id),
  UNIQUE(user_id)
);

-- Ajouter colonne pionnier sur drivers
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS is_pioneer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pioneer_since TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS nfc_tag_number TEXT;

-- RLS pour congress_invitations
ALTER TABLE public.congress_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage congress invitations"
ON public.congress_invitations
FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

CREATE POLICY "Public can view active invitations by slug"
ON public.congress_invitations
FOR SELECT
USING (is_active = true);

-- RLS pour congress_registrations
ALTER TABLE public.congress_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage congress registrations"
ON public.congress_registrations
FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

CREATE POLICY "Users can view own registration"
ON public.congress_registrations
FOR SELECT
USING (user_id = auth.uid());

-- Index pour performance
CREATE INDEX idx_congress_invitations_slug ON public.congress_invitations(slug);
CREATE INDEX idx_congress_registrations_invitation ON public.congress_registrations(invitation_id);
CREATE INDEX idx_drivers_pioneer ON public.drivers(is_pioneer) WHERE is_pioneer = true;

-- Trigger pour updated_at
CREATE TRIGGER update_congress_invitations_updated_at
BEFORE UPDATE ON public.congress_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();