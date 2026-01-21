/**
 * Hook de requête résilient avec auto-guérison
 * Solution définitive contre les erreurs de chargement récurrentes
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Configuration robuste pour tous les types de réseau
const CONFIG = {
  MAX_RETRIES: 5,
  INITIAL_TIMEOUT: 8000, // 8s
  MAX_TIMEOUT: 30000, // 30s
  BASE_DELAY: 500,
  MAX_DELAY: 10000,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
} as const;

// Cache en mémoire
const queryCache = new Map<string, { data: any; timestamp: number }>();

// État global de connexion
let globalConnectionState: 'online' | 'offline' | 'recovering' = 'online';
let lastSuccessfulQuery = Date.now();
let connectionListeners = new Set<(state: string) => void>();

export function getGlobalConnectionState() {
  return globalConnectionState;
}

export function onGlobalConnectionChange(cb: (state: string) => void) {
  connectionListeners.add(cb);
  return () => connectionListeners.delete(cb);
}

function updateGlobalConnectionState(newState: typeof globalConnectionState) {
  if (globalConnectionState !== newState) {
    globalConnectionState = newState;
    connectionListeners.forEach(cb => cb(newState));
  }
}

/**
 * Calcul du délai avec backoff exponentiel + jitter
 */
function calculateDelay(attempt: number): number {
  const base = CONFIG.BASE_DELAY * Math.pow(2, attempt);
  const jitter = Math.random() * CONFIG.BASE_DELAY;
  return Math.min(base + jitter, CONFIG.MAX_DELAY);
}

/**
 * Calcul du timeout progressif
 */
function calculateTimeout(attempt: number): number {
  return Math.min(CONFIG.INITIAL_TIMEOUT * (1 + attempt * 0.5), CONFIG.MAX_TIMEOUT);
}

interface UseResilientQueryOptions<T> {
  queryKey: string;
  queryFn: () => Promise<{ data: T | null; error: any }>;
  onError?: (error: any) => void;
  onSuccess?: (data: T) => void;
  enabled?: boolean;
  showErrorToast?: boolean;
  errorMessage?: string;
  useCache?: boolean;
  refetchOnFocus?: boolean;
}

interface UseResilientQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: any;
  refetch: () => Promise<void>;
  isRetrying: boolean;
  retryCount: number;
}

export function useResilientQuery<T>({
  queryKey,
  queryFn,
  onError,
  onSuccess,
  enabled = true,
  showErrorToast = true,
  errorMessage = 'Erreur de chargement',
  useCache = true,
  refetchOnFocus = true,
}: UseResilientQueryOptions<T>): UseResilientQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const executeQuery = useCallback(async (isBackground = false) => {
    if (!enabled) return;

    // Vérifier le cache d'abord
    if (useCache && !isBackground) {
      const cached = queryCache.get(queryKey);
      if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        setData(cached.data);
        setIsLoading(false);
        setError(null);
        return;
      }
    }

    // Annuler les requêtes précédentes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!isBackground) {
      setIsLoading(true);
    }
    setIsRetrying(false);
    setRetryCount(0);

    let attempt = 0;
    let lastError: any = null;

    while (attempt <= CONFIG.MAX_RETRIES && mountedRef.current) {
      try {
        const timeout = calculateTimeout(attempt);
        
        // Race entre requête et timeout
        const result = await Promise.race([
          queryFn(),
          new Promise<never>((_, reject) => {
            const id = setTimeout(() => reject(new Error('Timeout')), timeout);
            abortControllerRef.current?.signal.addEventListener('abort', () => {
              clearTimeout(id);
              reject(new Error('Aborted'));
            });
          }),
        ]);

        if (!mountedRef.current) return;

        if (result.error) {
          lastError = result.error;
          
          // Erreurs non-retryables
          if (result.error?.code === 'PGRST301' || result.error?.message?.includes('JWT')) {
            throw result.error;
          }
          
          attempt++;
          if (attempt <= CONFIG.MAX_RETRIES) {
            setIsRetrying(true);
            setRetryCount(attempt);
            await new Promise(r => setTimeout(r, calculateDelay(attempt)));
            continue;
          }
          throw result.error;
        }

        // Succès !
        if (mountedRef.current) {
          setData(result.data);
          setError(null);
          setIsLoading(false);
          setIsRetrying(false);
          
          // Mettre en cache
          if (useCache && result.data) {
            queryCache.set(queryKey, { data: result.data, timestamp: Date.now() });
          }
          
          // Mettre à jour état global
          lastSuccessfulQuery = Date.now();
          updateGlobalConnectionState('online');
          
          onSuccess?.(result.data as T);
        }
        return;
      } catch (err: any) {
        lastError = err;
        
        if (err.message === 'Aborted') {
          return;
        }

        attempt++;
        
        if (attempt <= CONFIG.MAX_RETRIES && mountedRef.current) {
          setIsRetrying(true);
          setRetryCount(attempt);
          
          const delay = calculateDelay(attempt);
          await new Promise(r => setTimeout(r, delay));
          
          if (!mountedRef.current) return;
        }
      }
    }

    // Échec final après tous les retries
    if (mountedRef.current) {
      setError(lastError);
      setIsLoading(false);
      setIsRetrying(false);
      
      // Utiliser le cache même expiré comme fallback
      if (useCache) {
        const cached = queryCache.get(queryKey);
        if (cached) {
          setData(cached.data);
        }
      }
      
      // Notifier l'erreur mais sans bloquer l'UI
      if (showErrorToast && lastError?.message !== 'Aborted') {
        toast.error(errorMessage, {
          description: 'Les données peuvent être obsolètes. Réessayez plus tard.',
          duration: 3000,
        });
      }
      
      onError?.(lastError);
      
      // Auto-retry en arrière-plan après 30s
      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          executeQuery(true);
        }
      }, 30000);
    }
  }, [enabled, queryKey, queryFn, useCache, showErrorToast, errorMessage, onSuccess, onError]);

  // Effet initial
  useEffect(() => {
    mountedRef.current = true;
    executeQuery();

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [enabled, queryKey]);

  // Refetch on focus
  useEffect(() => {
    if (!refetchOnFocus) return;

    const handleFocus = () => {
      // Refetch seulement si les données sont vieilles de plus de 2 minutes
      const cached = queryCache.get(queryKey);
      if (!cached || Date.now() - cached.timestamp > 2 * 60 * 1000) {
        executeQuery(true);
      }
    };

    const handleOnline = () => {
      updateGlobalConnectionState('recovering');
      setTimeout(() => executeQuery(true), 1000);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [refetchOnFocus, queryKey, executeQuery]);

  const refetch = useCallback(async () => {
    // Invalider le cache
    queryCache.delete(queryKey);
    await executeQuery();
  }, [queryKey, executeQuery]);

  return {
    data,
    isLoading,
    error,
    refetch,
    isRetrying,
    retryCount,
  };
}

/**
 * Wrapper pour les requêtes Supabase simples
 */
export function createResilientSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
) {
  return async (): Promise<{ data: T | null; error: any }> => {
    try {
      const result = await queryFn();
      return result;
    } catch (error: any) {
      return { data: null, error };
    }
  };
}

/**
 * Hook simplifié pour charger des données avec auto-guérison
 */
export function useAutoHealingData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  deps: any[] = []
): {
  data: T | null;
  loading: boolean;
  error: any;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const mountedRef = useRef(true);

  const fetchWithRetry = useCallback(async () => {
    setLoading(true);
    
    for (let i = 0; i < CONFIG.MAX_RETRIES; i++) {
      try {
        const result = await Promise.race([
          fetchFn(),
          new Promise<never>((_, rej) => 
            setTimeout(() => rej(new Error('Timeout')), calculateTimeout(i))
          )
        ]);
        
        if (mountedRef.current) {
          setData(result);
          setError(null);
          setLoading(false);
        }
        return;
      } catch (err) {
        if (i < CONFIG.MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, calculateDelay(i)));
        } else {
          if (mountedRef.current) {
            setError(err);
            setLoading(false);
          }
        }
      }
    }
  }, [fetchFn, ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    fetchWithRetry();
    return () => { mountedRef.current = false; };
  }, [fetchWithRetry]);

  return { data, loading, error, refetch: fetchWithRetry };
}
