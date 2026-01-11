-- Ajouter TikTok et d'autres réseaux sociaux professionnels
INSERT INTO public.social_links (platform, display_order, is_active, url)
VALUES 
  ('tiktok', 4, false, null),
  ('youtube', 5, false, null),
  ('twitter', 6, false, null)
ON CONFLICT DO NOTHING;