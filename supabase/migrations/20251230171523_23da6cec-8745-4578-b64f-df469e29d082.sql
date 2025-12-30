-- Créer le bucket company-documents pour les logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('company-documents', 'company-documents', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Politique pour upload des logos par les entreprises (propriétaires)
CREATE POLICY "Companies can upload their logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-documents' AND
  auth.uid() IS NOT NULL
);

-- Politique pour lecture publique des logos
CREATE POLICY "Public can view company documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-documents');

-- Politique pour update par les propriétaires
CREATE POLICY "Companies can update their logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-documents' AND
  auth.uid() IS NOT NULL
);

-- Politique pour delete par les propriétaires
CREATE POLICY "Companies can delete their logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-documents' AND
  auth.uid() IS NOT NULL
);