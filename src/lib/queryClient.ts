/**
 * Configuration React Query optimisée pour 1000+ connexions
 * Cache intelligent + gestion erreurs
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache 5 minutes par défaut
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      
      // Retry intelligent
      retry: (failureCount, error: any) => {
        // Pas de retry sur 404 ou erreurs auth
        if (error?.status === 404 || error?.status === 401) {
          return false;
        }
        return failureCount < 2;
      },
      
      // Refetch intelligent
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Pas de retry sur mutations
      retry: false,
    },
  },
});
