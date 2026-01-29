-- Table de cache pour les tokens API (évite le rate limiting sur cold starts)
CREATE TABLE IF NOT EXISTS public.api_token_cache (
  id TEXT PRIMARY KEY DEFAULT 'mapbox_default',
  access_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour le state du rate limiting (persisté en DB au lieu de mémoire)
CREATE TABLE IF NOT EXISTS public.rate_limit_state (
  api_key TEXT PRIMARY KEY,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_request TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache pour les résultats de geocoding (évite les appels répétés)
CREATE TABLE IF NOT EXISTS public.geocoding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  query_type TEXT NOT NULL DEFAULT 'address', -- 'address' ou 'city'
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- Index pour le nettoyage des entrées expirées
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_expires ON public.geocoding_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_hash ON public.geocoding_cache(query_hash);

-- Fonction de nettoyage du cache expiré
CREATE OR REPLACE FUNCTION cleanup_geocoding_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.geocoding_cache WHERE expires_at < NOW();
  DELETE FROM public.rate_limit_state WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies - ces tables sont utilisées par les edge functions avec service role
ALTER TABLE public.api_token_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geocoding_cache ENABLE ROW LEVEL SECURITY;

-- Permettre la lecture publique du cache de geocoding (améliore les performances)
CREATE POLICY "Allow public read geocoding cache"
  ON public.geocoding_cache FOR SELECT
  USING (true);

-- L'écriture se fait via service role dans les edge functions