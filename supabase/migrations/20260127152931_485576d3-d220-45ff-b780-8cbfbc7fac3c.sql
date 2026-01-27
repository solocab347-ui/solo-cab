-- Ajouter les champs de tracking pour le tunnel d'onboarding
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50) DEFAULT 'settings',
ADD COLUMN IF NOT EXISTS onboarding_settings_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_profile_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_documents_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Créer un index pour les requêtes fréquentes sur l'onboarding
CREATE INDEX IF NOT EXISTS idx_drivers_onboarding_completed ON public.drivers(onboarding_completed);

-- Mettre à jour les chauffeurs existants avec documents validés comme ayant terminé l'onboarding
UPDATE public.drivers
SET 
  onboarding_completed = TRUE,
  onboarding_settings_completed = TRUE,
  onboarding_profile_completed = TRUE,
  onboarding_documents_completed = TRUE,
  onboarding_completed_at = NOW()
WHERE documents_status = 'validated';