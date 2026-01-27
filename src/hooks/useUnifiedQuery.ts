/**
 * HOOK DE REQUÊTE UNIFIÉ
 * Combine les fonctionnalités de useResilientQuery et React Query
 * en un seul hook simple et robuste
 * 
 * Caractéristiques:
 * - Auto-retry avec backoff exponentiel (jusqu'à 5 tentatives)
 * - Cache automatique avec TTL configurable
 * - Support offline avec fallback cache
 * - Refetch automatique sur focus/reconnexion
 * - État de retry visible pour l'UI
 * - Intégration Sentry pour les erreurs
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  RETRY, 
  CACHE, 
  calculateRetryDelay, 
  calculateProgressiveTimeout,
  isRetryableError,
  categorizeError,
  ERROR_MESSAGES,
  TIMEOUTS,
} from '@/lib/networkConfig';
import { logger } from '@/lib/productionLogger';
import { captureError } from '@/lib/sentry';

// Cache mémoire partagé avec le module
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

interface UseUnifiedQueryOptions<T> {
  /** Clé unique pour le cache */
  queryKey: string;
  /** Fonction qui exécute la requête */
  queryFn: () => Promise<{ data: T | null; error: any }>;
  /** Activer/désactiver la requête */
  enabled?: boolean;
  /** Utiliser le cache */
  useCache?: boolean;
  /** Durée de vie du cache (ms) */
  cacheTTL?: number;
  /** Afficher les erreurs en toast */
  showErrorToast?: boolean;
  /** Message d'erreur personnalisé */
  errorMessage?: string;
  /** Refetch quand l'app revient au premier plan */
  refetchOnFocus?: boolean;
  /** Marquer comme critique (plus de retries, timeout plus long) */
  critical?: boolean;
  /** Callback succès */
  onSuccess?: (data: T) => void;
  /** Callback erreur */
  onError?: (error: any) => void;
}

interface UseUnifiedQueryResult<T> {
  /** Données retournées */
  data: T | null;
  /** Chargement initial */
  isLoading: boolean;
  /** Erreur éventuelle */
  error: any;
  /** En cours de retry */
  isRetrying: boolean;
  /** Numéro de la tentative actuelle */
  retryCount: number;
  /** Données proviennent du cache */
  fromCache: boolean;
  /** Force un nouveau chargement */
  refetch: () => Promise<void>;
}

export function useUnifiedQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
  useCache = true,
  cacheTTL = CACHE.STANDARD_TTL,
  showErrorToast = true,
  errorMessage,
  refetchOnFocus = true,
  critical = false,
  onSuccess,
  onError,
}: UseUnifiedQueryOptions<T>): UseUnifiedQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fromCache, setFromCache] = useState(false);

  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const maxRetries = critical ? RETRY.MAX_ATTEMPTS_CRITICAL : RETRY.MAX_ATTEMPTS;
  const baseTimeout = critical ? TIMEOUTS.CRITICAL : TIMEOUTS.QUERY;

  // Récupérer depuis le cache
  const getCached = useCallback((): T | null => {
    const cached = queryCache.get(queryKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    if (cached) {
      queryCache.delete(queryKey);
    }
    return null;
  }, [queryKey]);

  // Sauvegarder dans le cache
  const setCache = useCallback((value: T) => {
    queryCache.set(queryKey, { data: value, timestamp: Date.now(), ttl: cacheTTL });
  }, [queryKey, cacheTTL]);

  // Exécution de la requête avec retry
  const executeQuery = useCallback(async (isBackground = false) => {
    if (!enabled) return;

    // Vérifier le cache
    if (useCache && !isBackground) {
      const cached = getCached();
      if (cached !== null) {
        setData(cached);
        setIsLoading(false);
        setFromCache(true);
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
      setFromCache(false);
    }
    setIsRetrying(false);
    setRetryCount(0);

    let attempt = 0;
    let lastError: any = null;

    while (attempt <= maxRetries && mountedRef.current) {
      try {
        const timeout = calculateProgressiveTimeout(attempt, baseTimeout);

        const result = await Promise.race<{ data: T | null; error: any }>([
          queryFn(),
          new Promise((_, reject) => {
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

          // Erreur non-retryable
          if (!isRetryableError(result.error)) {
            throw result.error;
          }

          attempt++;
          if (attempt <= maxRetries) {
            setIsRetrying(true);
            setRetryCount(attempt);
            await new Promise(r => setTimeout(r, calculateRetryDelay(attempt)));
            continue;
          }
          throw result.error;
        }

        // Succès!
        if (mountedRef.current) {
          setData(result.data);
          setError(null);
          setIsLoading(false);
          setIsRetrying(false);
          setFromCache(false);

          if (useCache && result.data) {
            setCache(result.data as T);
          }

          onSuccess?.(result.data as T);
        }
        return;

      } catch (err: any) {
        lastError = err;

        if (err.message === 'Aborted') {
          return;
        }

        attempt++;

        if (attempt <= maxRetries && mountedRef.current && isRetryableError(err)) {
          setIsRetrying(true);
          setRetryCount(attempt);
          await new Promise(r => setTimeout(r, calculateRetryDelay(attempt)));
        }
      }
    }

    // Échec final
    if (mountedRef.current) {
      setError(lastError);
      setIsLoading(false);
      setIsRetrying(false);

      // Fallback sur cache expiré
      if (useCache) {
        const staleData = queryCache.get(queryKey);
        if (staleData) {
          setData(staleData.data);
          setFromCache(true);
          logger.info(`Using stale cache for ${queryKey}`);
        }
      }

      // Notification et logging
      const category = categorizeError(lastError);
      const message = errorMessage || ERROR_MESSAGES[category];

      if (showErrorToast && lastError?.message !== 'Aborted') {
        toast.error(message, {
          description: fromCache ? 'Données potentiellement obsolètes.' : 'Réessayez plus tard.',
          duration: 4000,
        });
      }

      // Log to Sentry if not a validation error
      if (category !== 'validation') {
        captureError(lastError, { context: queryKey, category }, 'warning');
      }

      onError?.(lastError);

      // Auto-retry en background après 30s
      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          executeQuery(true);
        }
      }, 30000);
    }
  }, [enabled, queryKey, queryFn, useCache, getCached, setCache, maxRetries, baseTimeout, showErrorToast, errorMessage, onSuccess, onError, fromCache]);

  // Effet initial
  useEffect(() => {
    mountedRef.current = true;
    executeQuery();

    return () => {
      mountedRef.current = false;
      abortControllerRef.current?.abort();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [enabled, queryKey]);

  // Refetch on focus/online
  useEffect(() => {
    if (!refetchOnFocus) return;

    const handleFocus = () => {
      const cached = queryCache.get(queryKey);
      if (!cached || Date.now() - cached.timestamp > 2 * 60 * 1000) {
        executeQuery(true);
      }
    };

    const handleOnline = () => {
      setTimeout(() => executeQuery(true), 1000);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refetchOnFocus, queryKey, executeQuery]);

  const refetch = useCallback(async () => {
    queryCache.delete(queryKey);
    await executeQuery();
  }, [queryKey, executeQuery]);

  return {
    data,
    isLoading,
    error,
    isRetrying,
    retryCount,
    fromCache,
    refetch,
  };
}

/**
 * Hook simplifié pour les mutations avec protection
 */
export function useUnifiedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData | null; error: any }>,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: any) => void;
    invalidateKeys?: string[];
  }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const isExecutingRef = useRef(false);

  const mutate = useCallback(async (variables: TVariables): Promise<TData | null> => {
    // Protection double-soumission
    if (isExecutingRef.current) {
      toast.warning('Opération en cours, veuillez patienter...');
      return null;
    }

    isExecutingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await mutationFn(variables);

      if (result.error) {
        throw result.error;
      }

      // Invalider le cache si spécifié
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach(key => queryCache.delete(key));
      }

      options?.onSuccess?.(result.data as TData);
      return result.data;

    } catch (err: any) {
      setError(err);
      const category = categorizeError(err);
      toast.error(ERROR_MESSAGES[category]);
      options?.onError?.(err);
      return null;

    } finally {
      setIsLoading(false);
      isExecutingRef.current = false;
    }
  }, [mutationFn, options]);

  return { mutate, isLoading, error };
}
