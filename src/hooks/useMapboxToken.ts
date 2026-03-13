import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

let cachedToken: string | null = null;
let tokenPromise: Promise<string | null> | null = null;

async function fetchToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('get-mapbox-token');
    if (error || !data?.token) {
      console.error('Failed to fetch Mapbox token:', error);
      return null;
    }
    cachedToken = data.token;
    return cachedToken;
  } catch (err) {
    console.error('Mapbox token fetch error:', err);
    return null;
  }
}

export function useMapboxToken() {
  const [token, setToken] = useState<string | null>(cachedToken);
  const [isLoading, setIsLoading] = useState(!cachedToken);

  useEffect(() => {
    if (cachedToken) {
      setToken(cachedToken);
      setIsLoading(false);
      return;
    }

    if (!tokenPromise) {
      tokenPromise = fetchToken();
    }

    tokenPromise.then((t) => {
      setToken(t);
      setIsLoading(false);
      tokenPromise = null;
    });
  }, []);

  return { token, isLoading };
}
