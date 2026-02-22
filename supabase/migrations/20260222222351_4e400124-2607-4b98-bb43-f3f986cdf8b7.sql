
-- Create storage bucket for podcast audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('podcast-audio', 'podcast-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload podcast audio
CREATE POLICY "Authenticated users can upload podcast audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'podcast-audio' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to update their podcast audio
CREATE POLICY "Authenticated users can update podcast audio"
ON storage.objects FOR UPDATE
USING (bucket_id = 'podcast-audio' AND auth.uid() IS NOT NULL);

-- Anyone can read podcast audio (public bucket)
CREATE POLICY "Public read access for podcast audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'podcast-audio');

-- Track generated podcast segments
CREATE TABLE public.podcast_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  episode_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, episode_id)
);

ALTER TABLE public.podcast_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own podcast segments"
ON public.podcast_segments FOR SELECT
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own podcast segments"
ON public.podcast_segments FOR INSERT
WITH CHECK (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own podcast segments"
ON public.podcast_segments FOR DELETE
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));
