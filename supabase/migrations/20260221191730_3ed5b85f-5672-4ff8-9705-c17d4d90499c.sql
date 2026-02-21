
-- Create storage bucket for training videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-videos', 'training-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view training videos (public bucket)
CREATE POLICY "Training videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-videos');

-- Only admins can upload/update/delete training videos
CREATE POLICY "Admins can upload training videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'training-videos' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update training videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'training-videos' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete training videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'training-videos' 
  AND public.has_role(auth.uid(), 'admin')
);
