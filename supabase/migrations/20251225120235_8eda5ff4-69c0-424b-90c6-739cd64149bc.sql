-- Table pour les documents requis personnalisés par le gestionnaire de flotte
CREATE TABLE IF NOT EXISTS public.fleet_required_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_manager_id UUID NOT NULL REFERENCES public.fleet_managers(id) ON DELETE CASCADE,
  document_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(fleet_manager_id, document_key)
);

-- Enable RLS
ALTER TABLE public.fleet_required_documents ENABLE ROW LEVEL SECURITY;

-- Policies for fleet managers
CREATE POLICY "Fleet managers can view their required documents"
ON public.fleet_required_documents FOR SELECT
USING (
  fleet_manager_id IN (
    SELECT fm.id FROM public.fleet_managers fm WHERE fm.user_id = auth.uid()
  )
);

CREATE POLICY "Fleet managers can manage their required documents"
ON public.fleet_required_documents FOR ALL
USING (
  fleet_manager_id IN (
    SELECT fm.id FROM public.fleet_managers fm WHERE fm.user_id = auth.uid()
  )
);

-- Drivers can view required documents for their fleet manager
CREATE POLICY "Fleet drivers can view required documents"
ON public.fleet_required_documents FOR SELECT
USING (
  fleet_manager_id IN (
    SELECT fmd.fleet_manager_id FROM public.fleet_manager_drivers fmd
    JOIN public.drivers d ON fmd.driver_id = d.id
    WHERE d.user_id = auth.uid()
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_fleet_required_documents_updated_at
BEFORE UPDATE ON public.fleet_required_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_company_employee_timestamp();

-- Initialiser les documents pour les gestionnaires existants
INSERT INTO public.fleet_required_documents (fleet_manager_id, document_key, label, description, is_required, display_order)
SELECT 
  fm.id,
  doc_data.key,
  doc_data.label,
  doc_data.description,
  true,
  doc_data.order_num
FROM public.fleet_managers fm
CROSS JOIN (
  VALUES 
    ('vtc_card', 'Carte professionnelle VTC', 'Carte VTC recto/verso en cours de validité', 1),
    ('driving_license', 'Permis de conduire', 'Permis B recto/verso en cours de validité', 2),
    ('id_card', 'Pièce d''identité', 'CNI ou passeport en cours de validité', 3),
    ('vehicle_registration', 'Carte grise du véhicule', 'Carte grise au nom du titulaire ou location', 4),
    ('insurance', 'Attestation d''assurance', 'Assurance RC Pro VTC en cours de validité', 5),
    ('kbis', 'Extrait Kbis ou INSEE', 'Document de moins de 3 mois', 6)
) AS doc_data(key, label, description, order_num)
ON CONFLICT (fleet_manager_id, document_key) DO NOTHING;

-- Fonction pour initialiser les documents par défaut pour un nouveau gestionnaire
CREATE OR REPLACE FUNCTION public.initialize_fleet_required_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.fleet_required_documents (fleet_manager_id, document_key, label, description, is_required, display_order)
  VALUES
    (NEW.id, 'vtc_card', 'Carte professionnelle VTC', 'Carte VTC recto/verso en cours de validité', true, 1),
    (NEW.id, 'driving_license', 'Permis de conduire', 'Permis B recto/verso en cours de validité', true, 2),
    (NEW.id, 'id_card', 'Pièce d''identité', 'CNI ou passeport en cours de validité', true, 3),
    (NEW.id, 'vehicle_registration', 'Carte grise du véhicule', 'Carte grise au nom du titulaire ou location', true, 4),
    (NEW.id, 'insurance', 'Attestation d''assurance', 'Assurance RC Pro VTC en cours de validité', true, 5),
    (NEW.id, 'kbis', 'Extrait Kbis ou INSEE', 'Document de moins de 3 mois', true, 6);
  RETURN NEW;
END;
$$;

-- Trigger pour auto-initialiser les documents requis
CREATE TRIGGER initialize_fleet_documents_on_create
AFTER INSERT ON public.fleet_managers
FOR EACH ROW
EXECUTE FUNCTION public.initialize_fleet_required_documents();