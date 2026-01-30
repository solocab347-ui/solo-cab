
-- Table pour tracker la campagne de réengagement
CREATE TABLE IF NOT EXISTS public.reengagement_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  blocked_step TEXT NOT NULL, -- 'settings', 'profile', 'documents', 'payment'
  campaign_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  campaign_end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  emails_sent INTEGER NOT NULL DEFAULT 0,
  last_email_sent_at TIMESTAMP WITH TIME ZONE,
  next_email_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  resumed_at TIMESTAMP WITH TIME ZONE, -- Quand l'utilisateur a repris
  completed_at TIMESTAMP WITH TIME ZONE, -- Quand l'utilisateur a terminé l'onboarding
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(driver_id)
);

-- Index pour les requêtes de campagne active
CREATE INDEX idx_reengagement_active ON public.reengagement_campaigns(is_active, next_email_at) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.reengagement_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy admin only
CREATE POLICY "Admin can manage reengagement campaigns"
ON public.reengagement_campaigns
FOR ALL
USING (
  EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

-- Fonction pour désactiver la campagne quand l'utilisateur revient
CREATE OR REPLACE FUNCTION public.check_driver_reengagement()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le chauffeur complète son onboarding, désactiver la campagne
  IF NEW.onboarding_completed = true AND (OLD.onboarding_completed IS NULL OR OLD.onboarding_completed = false) THEN
    UPDATE public.reengagement_campaigns
    SET 
      is_active = false,
      completed_at = now(),
      updated_at = now()
    WHERE driver_id = NEW.id AND is_active = true;
  END IF;
  
  -- Si le chauffeur progresse dans l'onboarding, noter la reprise
  IF (NEW.onboarding_step IS DISTINCT FROM OLD.onboarding_step) OR
     (NEW.onboarding_settings_completed = true AND OLD.onboarding_settings_completed = false) OR
     (NEW.onboarding_profile_completed = true AND OLD.onboarding_profile_completed = false) OR
     (NEW.onboarding_documents_completed = true AND OLD.onboarding_documents_completed = false) THEN
    UPDATE public.reengagement_campaigns
    SET 
      resumed_at = COALESCE(resumed_at, now()),
      blocked_step = NEW.onboarding_step,
      updated_at = now()
    WHERE driver_id = NEW.id AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger sur drivers
CREATE TRIGGER trigger_check_driver_reengagement
AFTER UPDATE ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.check_driver_reengagement();

-- Insérer les chauffeurs bloqués dans la campagne
INSERT INTO public.reengagement_campaigns (driver_id, user_id, email, full_name, phone, blocked_step)
SELECT 
  d.id,
  d.user_id,
  p.email,
  p.full_name,
  p.phone,
  COALESCE(d.onboarding_step, 'settings')
FROM drivers d
JOIN profiles p ON p.id = d.user_id
WHERE d.onboarding_completed = false 
  AND d.status IN ('pending', 'on_hold')
  AND p.email NOT LIKE '%test%'
  AND p.email NOT LIKE '%demo%'
ON CONFLICT (driver_id) DO NOTHING;
