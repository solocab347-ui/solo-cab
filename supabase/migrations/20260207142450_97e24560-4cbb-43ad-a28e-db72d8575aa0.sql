-- Table pour gérer les vidéos de formation SoloCab
CREATE TABLE public.training_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'welcome', -- 'welcome', 'features', 'tips', 'tutorial'
  duration_seconds INTEGER,
  is_mandatory BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table pour tracker les vidéos vues par les chauffeurs
CREATE TABLE public.driver_video_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.training_videos(id) ON DELETE CASCADE,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  watch_percentage INTEGER DEFAULT 0, -- 0-100
  completed BOOLEAN DEFAULT false,
  UNIQUE(driver_id, video_id)
);

-- Enable RLS
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_video_views ENABLE ROW LEVEL SECURITY;

-- Policies for training_videos (public read for active videos)
CREATE POLICY "Anyone can view active training videos"
  ON public.training_videos FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage training videos"
  ON public.training_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND 'admin' = ANY(roles)
    )
  );

-- Policies for driver_video_views
CREATE POLICY "Drivers can view their own video progress"
  ON public.driver_video_views FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can insert their own video progress"
  ON public.driver_video_views FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update their own video progress"
  ON public.driver_video_views FOR UPDATE
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_training_videos_updated_at
  BEFORE UPDATE ON public.training_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ajouter colonne pour tracker si la vidéo de bienvenue a été vue
ALTER TABLE public.drivers 
  ADD COLUMN IF NOT EXISTS welcome_video_watched BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_video_watched_at TIMESTAMP WITH TIME ZONE;

-- Insérer une vidéo de bienvenue par défaut (placeholder)
INSERT INTO public.training_videos (title, description, video_url, category, is_mandatory, display_order)
VALUES (
  'Bienvenue sur SoloCab',
  'Découvrez toutes les fonctionnalités de SoloCab pour développer votre clientèle VTC',
  'https://placeholder.com/welcome-video',
  'welcome',
  true,
  0
);