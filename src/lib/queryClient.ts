/**
 * Configuration React Query ROBUSTE
 * Utilise la configuration réseau centralisée
 * 
 * @deprecated Préférer unifiedQueryClient.ts pour les nouveaux développements
 */

import { QueryClient } from '@tanstack/react-query';
import { CACHE, RETRY, calculateRetryDelay, isRetryableError } from './networkConfig';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Phase 2 cost-opt : staleTime par défaut 10 min (était 5 min).
      // Les hooks critiques (driver-profile, courses, notifications) overrident déjà
      // avec leur propre staleTime court, donc cette valeur affecte uniquement
      // les lectures secondaires (settings, listes statiques, métadonnées).
      staleTime: 10 * 60 * 1000,
      gcTime: CACHE.STATIC_TTL, // 30 minutes
      
      // Phase 1 perf : éviter les refetch redondants au mount si data fraîche
      refetchOnWindowFocus: false,
      refetchOnMount: false,
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
 * Invalider les queries critiques après reconnexion ou changement d'état
 */
export function invalidateCriticalQueries() {
  queryClient.invalidateQueries({ queryKey: ['user-roles'] });
  queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
  queryClient.invalidateQueries({ queryKey: ['client-profile'] });
  queryClient.invalidateQueries({ queryKey: ['courses'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
  queryClient.invalidateQueries({ queryKey: ['devis'] });
  queryClient.invalidateQueries({ queryKey: ['factures'] });
}
