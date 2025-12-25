-- Ajouter les colonnes pour la gestion intelligente des documents chauffeurs
ALTER TABLE public.fleet_manager_drivers
ADD COLUMN IF NOT EXISTS temporary_access_granted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS temporary_access_reason TEXT,
ADD COLUMN IF NOT EXISTS temporary_access_granted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS temporary_access_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_documents JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS documents_rejection_reason TEXT;

-- Commentaires explicatifs
COMMENT ON COLUMN public.fleet_manager_drivers.temporary_access_granted IS 'Le gestionnaire peut accorder un accès temporaire malgré documents en attente';
COMMENT ON COLUMN public.fleet_manager_drivers.temporary_access_reason IS 'Raison de l''accès temporaire accordé';
COMMENT ON COLUMN public.fleet_manager_drivers.temporary_access_expires_at IS 'Date d''expiration de l''accès temporaire';
COMMENT ON COLUMN public.fleet_manager_drivers.rejected_documents IS 'Liste des documents rejetés avec raisons';
COMMENT ON COLUMN public.fleet_manager_drivers.documents_rejection_reason IS 'Raison globale du rejet des documents';