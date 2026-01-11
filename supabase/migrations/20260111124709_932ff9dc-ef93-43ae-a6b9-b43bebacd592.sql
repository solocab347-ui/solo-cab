-- Create driver_documents table for detailed document tracking
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'id_card_recto', 'id_card_verso', 'vtc_card_recto', 'vtc_card_verso', 'driving_license_recto', 'driving_license_verso', 'vehicle_registration', 'insurance', 'kbis', 'passport'
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'validated', 'rejected'
  rejection_reason TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false, -- Locked after validation (except insurance/carte grise)
  can_be_updated BOOLEAN NOT NULL DEFAULT true, -- For insurance/carte grise that can be renewed
  expires_at TIMESTAMP WITH TIME ZONE, -- For documents with expiration dates
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_driver_documents_driver_id ON public.driver_documents(driver_id);
CREATE INDEX idx_driver_documents_status ON public.driver_documents(status);
CREATE INDEX idx_driver_documents_type ON public.driver_documents(document_type);

-- Enable RLS
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own documents
CREATE POLICY "Drivers can view their own documents"
ON public.driver_documents FOR SELECT
USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Drivers can insert their own documents
CREATE POLICY "Drivers can insert their own documents"
ON public.driver_documents FOR INSERT
WITH CHECK (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
);

-- Drivers can update non-locked documents
CREATE POLICY "Drivers can update their non-locked documents"
ON public.driver_documents FOR UPDATE
USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  AND (is_locked = false OR can_be_updated = true)
);

-- Admins can do everything
CREATE POLICY "Admins can manage all driver documents"
ON public.driver_documents FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Fleet managers can view documents of their drivers
CREATE POLICY "Fleet managers can view their drivers documents"
ON public.driver_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.fleet_manager_drivers fmd
    JOIN public.fleet_managers fm ON fm.id = fmd.fleet_manager_id
    WHERE fmd.driver_id = driver_documents.driver_id
    AND fm.user_id = auth.uid()
  )
);

-- Create document_types reference table
CREATE TABLE IF NOT EXISTS public.document_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  allows_multiple_files BOOLEAN NOT NULL DEFAULT false, -- e.g. recto/verso
  can_be_updated_after_validation BOOLEAN NOT NULL DEFAULT false, -- For insurance, carte grise
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default document types
INSERT INTO public.document_types (id, label, description, is_required, allows_multiple_files, can_be_updated_after_validation, display_order) VALUES
  ('id_card_recto', 'Pièce d''identité (Recto)', 'Face avant de votre CNI ou passeport', true, false, false, 1),
  ('id_card_verso', 'Pièce d''identité (Verso)', 'Face arrière de votre CNI (optionnel si passeport)', false, false, false, 2),
  ('passport', 'Passeport (Alternative)', 'Si vous n''avez pas de CNI', false, false, false, 3),
  ('vtc_card_recto', 'Carte VTC (Recto)', 'Face avant de votre carte professionnelle VTC', true, false, false, 4),
  ('vtc_card_verso', 'Carte VTC (Verso)', 'Face arrière de votre carte professionnelle VTC', true, false, false, 5),
  ('driving_license_recto', 'Permis de conduire (Recto)', 'Face avant du permis B', true, false, false, 6),
  ('driving_license_verso', 'Permis de conduire (Verso)', 'Face arrière du permis B', true, false, false, 7),
  ('vehicle_registration', 'Carte grise', 'Carte grise du véhicule', true, false, true, 8),
  ('insurance', 'Attestation d''assurance', 'Assurance RC Pro VTC en cours de validité', true, false, true, 9),
  ('kbis', 'Extrait Kbis ou INSEE', 'Document de moins de 3 mois', true, false, false, 10)
ON CONFLICT (id) DO NOTHING;

-- RLS for document_types (public read)
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view document types" ON public.document_types FOR SELECT USING (true);
CREATE POLICY "Only admins can modify document types" ON public.document_types FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Add trigger for updated_at
CREATE TRIGGER update_driver_documents_updated_at
BEFORE UPDATE ON public.driver_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for driver_documents
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_documents;