-- ===================================================================
-- Migration: Système d'essai gratuit 14 jours SANS empreinte bancaire
-- ===================================================================

-- 1. Ajouter les colonnes pour l'essai gratuit de 14 jours
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_status TEXT DEFAULT 'pending' CHECK (trial_status IN ('pending', 'active', 'expired', 'converted')),
ADD COLUMN IF NOT EXISTS trial_activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS documents_validated_at TIMESTAMP WITH TIME ZONE;

-- 2. Créer une table pour les emails de relance d'essai
CREATE TABLE IF NOT EXISTS public.trial_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('j3_onboarding', 'j7_value', 'j10_projection', 'j13_warning', 'j14_expiry')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(driver_id, email_type)
);

-- 3. Activer RLS sur la table trial_emails
ALTER TABLE public.trial_emails ENABLE ROW LEVEL SECURITY;

-- 4. Politique RLS pour trial_emails (admin et service uniquement)
CREATE POLICY "Service role can manage trial_emails" 
ON public.trial_emails FOR ALL 
USING (true) 
WITH CHECK (true);

-- 5. Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_drivers_trial_status ON public.drivers(trial_status);
CREATE INDEX IF NOT EXISTS idx_drivers_trial_end_date ON public.drivers(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_trial_emails_scheduled ON public.trial_emails(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trial_emails_driver ON public.trial_emails(driver_id);

-- 6. Fonction pour planifier les emails de relance à l'activation de l'essai
CREATE OR REPLACE FUNCTION public.schedule_trial_emails(p_driver_id UUID, p_trial_start TIMESTAMP WITH TIME ZONE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Supprimer les anciens emails non envoyés
  DELETE FROM trial_emails WHERE driver_id = p_driver_id AND sent_at IS NULL;
  
  -- Planifier les nouveaux emails
  INSERT INTO trial_emails (driver_id, email_type, scheduled_for) VALUES
    (p_driver_id, 'j3_onboarding', p_trial_start + INTERVAL '3 days'),
    (p_driver_id, 'j7_value', p_trial_start + INTERVAL '7 days'),
    (p_driver_id, 'j10_projection', p_trial_start + INTERVAL '10 days'),
    (p_driver_id, 'j13_warning', p_trial_start + INTERVAL '13 days'),
    (p_driver_id, 'j14_expiry', p_trial_start + INTERVAL '14 days')
  ON CONFLICT (driver_id, email_type) DO UPDATE 
  SET scheduled_for = EXCLUDED.scheduled_for, sent_at = NULL;
END;
$$;

-- 7. Commentaires pour documentation
COMMENT ON COLUMN public.drivers.trial_start_date IS 'Date de début de l''essai gratuit (après validation des documents)';
COMMENT ON COLUMN public.drivers.trial_end_date IS 'Date de fin de l''essai gratuit (14 jours après trial_start_date)';
COMMENT ON COLUMN public.drivers.trial_status IS 'Statut de l''essai: pending (avant validation), active (en cours), expired (terminé), converted (abonné)';
COMMENT ON COLUMN public.drivers.trial_activated_at IS 'Date d''activation de l''essai (validation des documents)';
COMMENT ON COLUMN public.drivers.documents_validated_at IS 'Date de validation des documents par l''admin';
COMMENT ON TABLE public.trial_emails IS 'Emails de relance programmés pendant la période d''essai';