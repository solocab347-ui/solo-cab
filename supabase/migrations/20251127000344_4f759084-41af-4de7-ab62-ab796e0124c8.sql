-- Assurer que le bucket profile-photos existe et est public
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Supprimer les anciennes policies pour profile-photos
DROP POLICY IF EXISTS "Authenticated users can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Public profile photos are accessible" ON storage.objects;
DROP POLICY IF EXISTS "Profile photos are publicly accessible" ON storage.objects;

-- Créer les policies correctes pour profile-photos
-- 1. Lecture publique
CREATE POLICY "Profile photos are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- 2. Upload pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
);

-- 3. Update pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can update profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos')
WITH CHECK (bucket_id = 'profile-photos');

-- 4. Delete pour utilisateurs authentifiés  
CREATE POLICY "Authenticated users can delete profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos');
