/**
 * CLIENT DE REQUÊTES UNIFIÉ
 * Remplace la fragmentation entre React Query, useResilientQuery, et optimizedQuery
 * 
 * Fonctionnalités:
 * - Retry intelligent avec backoff exponentiel
 * - Cache multi-niveau (mémoire + session)
 * - Timeout progressif
 * - Logging centralisé
 * - Support offline-first
 */

import { QueryClient } from '@tanstack/react-query';
import { 
  TIMEOUTS, 
  RETRY, 
  CACHE, 
  calculateRetryDelay, 
  calculateProgressiveTimeout,
  isRetryableError,
  categorizeError,
  ERROR_MESSAGES,
} from './networkConfig';
import { logger } from './productionLogger';

// Cache mémoire centralisé avec TTL
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

/**
 * QueryClient React Query avec configuration optimisée
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE.STANDARD_TTL,
      gcTime: CACHE.STATIC_TTL,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (!isRetryableError(error)) return false;
        return failureCount < RETRY.MAX_ATTEMPTS;
      },
      retryDelay: (attemptIndex) => calculateRetryDelay(attemptIndex),
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: (failureCount, error) => {
        if (!isRetryableError(error)) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => calculateRetryDelay(attemptIndex),
      networkMode: 'online',
    },
  },
});

/**
 * Interface pour options de requête
 */
interface QueryOptions {
  timeout?: number;
  retries?: number;
  cacheKey?: string;
  cacheTTL?: number;
  critical?: boolean;
  context?: string;
  showErrorToast?: boolean;
}

/**
 * Résultat standardisé de requête
 */
interface QueryResult<T> {
  data: T | null;
  error: any;
  fromCache: boolean;
  latency: number;
}

/**
 * Vérifie et retourne les données du cache si valides
 */
function getCached<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  if (cached) {
    memoryCache.delete(key);
  }
  return null;
}

/**
 * Sauvegarde dans le cache
 */
function setCache(key: string, data: any, ttl: number = CACHE.STANDARD_TTL): void {
  memoryCache.set(key, { data, timestamp: Date.now(), ttl });
  
  // Nettoyage si le cache devient trop grand
  if (memoryCache.size > 100) {
    const oldest = Array.from(memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 20);
    oldest.forEach(([key]) => memoryCache.delete(key));
  }
}

/**
 * Exécute une requête avec retry, timeout et cache
 */
export async function executeQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const {
    timeout = options.critical ? TIMEOUTS.CRITICAL : TIMEOUTS.QUERY,
    retries = options.critical ? RETRY.MAX_ATTEMPTS_CRITICAL : RETRY.MAX_ATTEMPTS,
    cacheKey,
    cacheTTL = CACHE.STANDARD_TTL,
    context = 'query',
    showErrorToast = true,
  } = options;

  const startTime = Date.now();

  // Vérifier le cache d'abord
  if (cacheKey) {
    const cached = getCached<T>(cacheKey);
    if (cached !== null) {
      logger.debug(`Cache hit for ${context}`, { cacheKey });
      return {
        data: cached,
        error: null,
        fromCache: true,
        latency: Date.now() - startTime,
      };
    }
  }

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const currentTimeout = calculateProgressiveTimeout(attempt, timeout);
      
      // Race entre requête et timeout
      const result = await Promise.race<{ data: T | null; error: any }>([
        queryFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout après ${currentTimeout}ms`)), currentTimeout)
        ),
      ]);

      if (result.error) {
        lastError = result.error;
        
        // Erreur non-retryable
        if (!isRetryableError(result.error)) {
          logger.warn(`Non-retryable error in ${context}`, { error: result.error?.message });
          return {
            data: null,
            error: result.error,
            fromCache: false,
            latency: Date.now() - startTime,
          };
        }
        
        // Retry si possible
        if (attempt < retries) {
          const delay = calculateRetryDelay(attempt);
          logger.info(`Retry ${attempt + 1}/${retries} for ${context} in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        
        throw result.error;
      }

      // Succès!
      const latency = Date.now() - startTime;
      
      if (cacheKey && result.data) {
        setCache(cacheKey, result.data, cacheTTL);
      }

      return {
        data: result.data,
        error: null,
        fromCache: false,
        latency,
      };

    } catch (error: any) {
      lastError = error;
      
      if (!isRetryableError(error)) {
        break;
      }

      if (attempt < retries) {
        const delay = calculateRetryDelay(attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // Échec final
  const errorCategory = categorizeError(lastError);
  logger.error(`Query failed: ${context}`, { 
    error: lastError?.message,
    category: errorCategory,
    attempts: retries + 1,
  });

  // Fallback sur cache expiré si disponible
  if (cacheKey) {
    const staleData = memoryCache.get(cacheKey);
    if (staleData) {
      logger.info(`Using stale cache for ${context}`);
      return {
        data: staleData.data,
        error: lastError,
        fromCache: true,
        latency: Date.now() - startTime,
      };
    }
  }

  return {
    data: null,
    error: lastError,
    fromCache: false,
    latency: Date.now() - startTime,
  };
}

/**
 * Invalide le cache pour une clé ou un pattern
 */
export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Invalide les queries React Query critiques
 */
export function invalidateCriticalQueries(): void {
  queryClient.invalidateQueries({ queryKey: ['user-roles'] });
  queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
  queryClient.invalidateQueries({ queryKey: ['client-profile'] });
  queryClient.invalidateQueries({ queryKey: ['courses'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  queryClient.invalidateQueries({ queryKey: ['devis'] });
  queryClient.invalidateQueries({ queryKey: ['factures'] });
}

/**
 * Précharge les données critiques pour un utilisateur
 */
export async function prefetchUserData(userId: string): Promise<void> {
  if (!userId) return;
  
  const { supabase } = await import('@/integrations/supabase/client');
  
  const prefetchPromises = [
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("drivers").select("id, status, is_pioneer, subscription_paid, is_fleet_driver, fleet_manager_id, free_access_granted, free_access_end_date, created_at, stripe_customer_id").eq("user_id", userId).maybeSingle(),
    supabase.from("clients").select("id, is_exclusive, driver_id").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", userId).single(),
  ];

  try {
    await Promise.allSettled(prefetchPromises);
    logger.info('Prefetch completed', { userId });
  } catch {
    // Échec silencieux - le prefetch est optionnel
  }
}

// Export pour compatibilité avec l'ancien queryClient.ts
export { queryClient as default };
