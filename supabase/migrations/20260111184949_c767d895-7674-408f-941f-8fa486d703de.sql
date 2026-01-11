-- Rendre les buckets de documents accessibles publiquement
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('driver-documents', 'fleet-manager-documents');

-- Ajouter/mettre à jour les policies RLS pour permettre la lecture publique
DROP POLICY IF EXISTS "Allow public read access on driver-documents" ON storage.objects;
CREATE POLICY "Allow public read access on driver-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'driver-documents');

DROP POLICY IF EXISTS "Allow public read access on fleet-manager-documents" ON storage.objects;
CREATE POLICY "Allow public read access on fleet-manager-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'fleet-manager-documents');