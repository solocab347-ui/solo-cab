-- Table pour stocker les validations de documents par les gestionnaires de flotte
CREATE TABLE IF NOT EXISTS public.fleet_driver_document_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  document_name TEXT,
  original_uploaded_at TIMESTAMP WITH TIME ZONE,
  validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  validated_by_user_id UUID,
  status TEXT NOT NULL DEFAULT 'validated',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Contrainte unique pour éviter les doublons
  UNIQUE(fleet_manager_id, driver_id, document_type)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_fleet_driver_doc_validations_fleet_manager ON public.fleet_driver_document_validations(fleet_manager_id);
CREATE INDEX IF NOT EXISTS idx_fleet_driver_doc_validations_driver ON public.fleet_driver_document_validations(driver_id);

-- Enable RLS
ALTER TABLE public.fleet_driver_document_validations ENABLE ROW LEVEL SECURITY;

-- Policies: gestionnaires peuvent voir et créer les validations de leurs chauffeurs
CREATE POLICY "Fleet managers can view their driver validations"
ON public.fleet_driver_document_validations
FOR SELECT
USING (
  fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Fleet managers can insert driver validations"
ON public.fleet_driver_document_validations
FOR INSERT
WITH CHECK (
  fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Fleet managers can update their driver validations"
ON public.fleet_driver_document_validations
FOR UPDATE
USING (
  fleet_manager_id IN (
    SELECT id FROM public.fleet_managers WHERE user_id = auth.uid()
  )
);

-- Drivers can view validations for their own documents
CREATE POLICY "Drivers can view their document validations"
ON public.fleet_driver_document_validations
FOR SELECT
USING (
  driver_id IN (
    SELECT id FROM public.drivers WHERE user_id = auth.uid()
  )
);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_fleet_driver_doc_validations_updated_at
BEFORE UPDATE ON public.fleet_driver_document_validations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();