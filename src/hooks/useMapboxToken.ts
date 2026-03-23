import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

async function fetchToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('get-mapbox-token');
    if (error || !data?.token) {
      console.error('Failed to fetch Mapbox token:', error);
      tokenPromise = null;
      return null;
    }
    cachedToken = data.token;
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
