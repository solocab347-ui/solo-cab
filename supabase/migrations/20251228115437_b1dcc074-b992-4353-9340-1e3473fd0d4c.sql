-- Table pour stocker les invitations de course avec lien d'inscription
CREATE TABLE public.course_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  
  -- Informations de la course pré-calculée
  pickup_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  distance_km NUMERIC,
  duration_minutes INTEGER,
  estimated_price NUMERIC NOT NULL,
  price_details JSONB,
  
  -- État de l'invitation
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  
  -- Client associé une fois inscrit
  client_id UUID REFERENCES public.clients(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.course_invitations ENABLE ROW LEVEL SECURITY;

-- Index pour recherche rapide par token
CREATE INDEX idx_course_invitations_token ON public.course_invitations(token);
CREATE INDEX idx_course_invitations_driver ON public.course_invitations(driver_id);
CREATE INDEX idx_course_invitations_status ON public.course_invitations(status);

-- Policies RLS
-- Les chauffeurs peuvent voir leurs propres invitations
CREATE POLICY "Drivers can view own invitations" 
ON public.course_invitations 
FOR SELECT 
USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Les chauffeurs peuvent créer des invitations
CREATE POLICY "Drivers can create invitations" 
ON public.course_invitations 
FOR INSERT 
WITH CHECK (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Les chauffeurs peuvent annuler leurs invitations
CREATE POLICY "Drivers can update own invitations" 
ON public.course_invitations 
FOR UPDATE 
USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Tout le monde peut lire via token (pour la page d'inscription publique)
CREATE POLICY "Anyone can view invitation by token" 
ON public.course_invitations 
FOR SELECT 
USING (true);

-- Fonction pour récupérer une invitation par token (publique)
CREATE OR REPLACE FUNCTION public.get_course_invitation_by_token(_token UUID)
RETURNS TABLE (
  id UUID,
  token UUID,
  driver_id UUID,
  course_id UUID,
  pickup_address TEXT,
  destination_address TEXT,
  distance_km NUMERIC,
  duration_minutes INTEGER,
  estimated_price NUMERIC,
  price_details JSONB,
  status TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  driver_name TEXT,
  driver_company TEXT,
  driver_photo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.token,
    ci.driver_id,
    ci.course_id,
    ci.pickup_address,
    ci.destination_address,
    ci.distance_km,
    ci.duration_minutes,
    ci.estimated_price,
    ci.price_details,
    ci.status,
    ci.expires_at,
    p.full_name AS driver_name,
    d.company_name AS driver_company,
    p.profile_photo_url AS driver_photo
  FROM public.course_invitations ci
  JOIN public.drivers d ON ci.driver_id = d.id
  JOIN public.profiles p ON d.user_id = p.id
  WHERE ci.token = _token
    AND ci.status = 'pending'
    AND ci.expires_at > now();
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_course_invitation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_course_invitations_updated_at
BEFORE UPDATE ON public.course_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_course_invitation_timestamp();