-- Ajouter les champs pour la reprise d'inscription
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS registration_step INTEGER,
ADD COLUMN IF NOT EXISTS registration_data JSONB;

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_drivers_registration_step 
ON public.drivers(registration_step) 
WHERE registration_step IS NOT NULL;

-- Commentaires pour documentation
COMMENT ON COLUMN public.drivers.registration_step IS 'Étape de l''inscription en cours (1=infos personnelles, 2=documents, 3=paiement, NULL=inscription complète)';
COMMENT ON COLUMN public.drivers.registration_data IS 'Données temporaires de l''inscription (formData, documents uploadés, etc.)';