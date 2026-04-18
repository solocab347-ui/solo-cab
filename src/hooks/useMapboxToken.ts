import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Persistent localStorage cache to avoid repeated edge function calls (24h TTL)
const STORAGE_KEY = 'sc_mapbox_token_v1';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

// Hydrate from localStorage on module load
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed?.token && parsed?.ts && Date.now() - parsed.ts < TTL_MS) {
      cachedToken = parsed.token;
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
} catch {}

async function fetchToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('get-mapbox-token');
    if (error || !data?.token) {
      console.error('Failed to fetch Mapbox token:', error);
      tokenPromise = null;
      return null;
    }
    cachedToken = data.token;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, ts: Date.now() })); } catch {}
    tokenPromise = null;
    return cachedToken;
  } catch (err) {
    console.error('Mapbox token fetch error:', err);
    tokenPromise = null;
    return null;
  }
}

export function useMapboxToken() {
  const [token, setToken] = useState<string | null>(cachedToken);
  const [isLoading, setIsLoading] = useState(!cachedToken);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedToken) {
      setToken(cachedToken);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!tokenPromise) {
      tokenPromise = fetchToken();
    }

    tokenPromise.then((t) => {
      setToken(t);
      setIsLoading(false);
      setError(t ? null : 'Token Mapbox indisponible');
    });
  }, []);

  return { token, isLoading, error };
}
