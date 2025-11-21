-- Créer le bucket pour les documents des chauffeurs
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', false);

-- RLS policies pour le bucket driver-documents
-- Les chauffeurs peuvent uploader leurs propres documents
CREATE POLICY "Drivers can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Les chauffeurs peuvent voir leurs propres documents
CREATE POLICY "Drivers can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Les admins peuvent voir tous les documents
CREATE POLICY "Admins can view all driver documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Les admins peuvent supprimer des documents
CREATE POLICY "Admins can delete driver documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Ajouter une colonne documents JSON dans la table drivers pour stocker les URLs
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}'::jsonb;

-- Ajouter une colonne pour le statut de l'abonnement
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS subscription_paid BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.drivers.documents IS 'Stocke les URLs des documents: id_recto, id_verso, vtc_recto, vtc_verso, carte_grise, assurance';
COMMENT ON COLUMN public.drivers.subscription_paid IS 'Indique si l''abonnement initial a été payé';