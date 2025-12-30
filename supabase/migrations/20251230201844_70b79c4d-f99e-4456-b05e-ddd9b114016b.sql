-- Créer le bucket fleet-documents pour les logos des gestionnaires de flotte
INSERT INTO storage.buckets (id, name, public)
VALUES ('fleet-documents', 'fleet-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre aux gestionnaires de télécharger leurs logos
CREATE POLICY "Fleet managers can upload their logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'fleet-documents' 
  AND auth.uid() IN (
    SELECT user_id FROM public.fleet_managers
  )
);

-- Politique pour permettre la lecture publique
CREATE POLICY "Fleet documents are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'fleet-documents');

-- Politique pour permettre aux gestionnaires de mettre à jour leurs fichiers
CREATE POLICY "Fleet managers can update their files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'fleet-documents'
  AND auth.uid() IN (
    SELECT user_id FROM public.fleet_managers
  )
);

-- Politique pour permettre aux gestionnaires de supprimer leurs fichiers
CREATE POLICY "Fleet managers can delete their files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'fleet-documents'
  AND auth.uid() IN (
    SELECT user_id FROM public.fleet_managers
  )
);