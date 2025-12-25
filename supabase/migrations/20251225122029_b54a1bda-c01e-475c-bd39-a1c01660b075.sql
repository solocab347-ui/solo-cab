-- Ajouter le buffer configurable pour les courses (défaut 60 minutes = 1h)
ALTER TABLE public.fleet_managers
ADD COLUMN IF NOT EXISTS course_buffer_minutes INTEGER DEFAULT 60;

-- Ajouter une colonne pour traquer les raisons de suppression des chauffeurs
ALTER TABLE public.fleet_manager_drivers
ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS removed_reason TEXT,
ADD COLUMN IF NOT EXISTS removed_by_manager BOOLEAN DEFAULT false;

-- Créer une table pour stocker l'historique des documents archivés
CREATE TABLE IF NOT EXISTS public.fleet_driver_documents_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  document_label TEXT NOT NULL,
  document_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by_user_id UUID,
  status TEXT DEFAULT 'pending', -- pending, validated, rejected
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fleet_driver_documents_archive ENABLE ROW LEVEL SECURITY;

-- Policy: Fleet managers can view their drivers' document archives
CREATE POLICY "Fleet managers can view their driver document archives"
ON public.fleet_driver_documents_archive FOR SELECT
USING (
  fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  )
);

-- Policy: Fleet managers can insert document archives
CREATE POLICY "Fleet managers can insert driver document archives"
ON public.fleet_driver_documents_archive FOR INSERT
WITH CHECK (
  fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  )
);

-- Ajouter index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_fleet_driver_documents_archive_fleet
ON public.fleet_driver_documents_archive(fleet_manager_id);

CREATE INDEX IF NOT EXISTS idx_fleet_driver_documents_archive_driver
ON public.fleet_driver_documents_archive(driver_id);

-- Commenter les colonnes
COMMENT ON COLUMN public.fleet_managers.course_buffer_minutes IS 'Buffer en minutes avant/après chaque course (défaut 60 min)';
COMMENT ON COLUMN public.fleet_manager_drivers.removed_at IS 'Date de suppression du chauffeur par le gestionnaire';
COMMENT ON COLUMN public.fleet_manager_drivers.removed_reason IS 'Raison de la suppression';
COMMENT ON COLUMN public.fleet_manager_drivers.removed_by_manager IS 'Indique si supprimé par le gestionnaire';