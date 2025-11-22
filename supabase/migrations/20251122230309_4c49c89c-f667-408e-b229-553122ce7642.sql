-- Add gallery photos and vehicle photos to drivers table
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS gallery_photos TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS vehicle_photos TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create a table for popular VTC vehicles with pre-generated images
CREATE TABLE IF NOT EXISTS public.vtc_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT NOT NULL, -- 'berline', 'van', 'electric', 'premium'
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on vtc_vehicles table
ALTER TABLE public.vtc_vehicles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view VTC vehicles (public data)
CREATE POLICY "VTC vehicles are viewable by everyone"
ON public.vtc_vehicles
FOR SELECT
USING (true);

-- Insert popular VTC vehicles
INSERT INTO public.vtc_vehicles (brand, model, category, image_url) VALUES
('Mercedes', 'Classe E', 'berline', 'mercedes-e-class'),
('Mercedes', 'Classe S', 'premium', 'mercedes-s-class'),
('Mercedes', 'Classe V', 'van', 'mercedes-v-class'),
('Mercedes', 'Vito', 'van', 'mercedes-vito'),
('BMW', 'Série 5', 'berline', 'bmw-5-series'),
('BMW', 'Série 7', 'premium', 'bmw-7-series'),
('Audi', 'A6', 'berline', 'audi-a6'),
('Audi', 'A8', 'premium', 'audi-a8'),
('Tesla', 'Model S', 'electric', 'tesla-model-s'),
('Tesla', 'Model 3', 'electric', 'tesla-model-3'),
('Tesla', 'Model X', 'electric', 'tesla-model-x'),
('Volkswagen', 'Caravelle', 'van', 'vw-caravelle'),
('Volkswagen', 'Multivan', 'van', 'vw-multivan'),
('Renault', 'Trafic', 'van', 'renault-trafic'),
('Peugeot', 'Traveller', 'van', 'peugeot-traveller'),
('Peugeot', 'Expert', 'van', 'peugeot-expert'),
('Citroën', 'SpaceTourer', 'van', 'citroen-spacetourer'),
('Citroën', 'Jumpy', 'van', 'citroen-jumpy'),
('Toyota', 'Camry', 'berline', 'toyota-camry'),
('Skoda', 'Superb', 'berline', 'skoda-superb');