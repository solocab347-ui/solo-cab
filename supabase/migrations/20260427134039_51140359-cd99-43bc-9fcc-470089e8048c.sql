-- Tighten INSERT policy on feedback-attachments storage to user folder only
DROP POLICY IF EXISTS "Authenticated users can upload feedback attachments" ON storage.objects;

CREATE POLICY "Users can upload feedback in their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'feedback-attachments'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to upload anywhere in the bucket (e.g. attaching admin-side files)
CREATE POLICY "Admins can upload feedback attachments anywhere"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'feedback-attachments'
  AND has_role(auth.uid(), 'admin'::text)
);