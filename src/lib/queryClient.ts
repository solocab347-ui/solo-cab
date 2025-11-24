/**
 * Configuration React Query ULTRA-OPTIMISÉE pour performances maximales
 * Cache agressif + refetch minimal pour fluidité
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache ULTRA agressif pour performances max
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes en mémoire
      
      // Désactiver TOUS les refetch automatiques pour performances
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      
      // Retry minimal
      retry: 1,
      retryDelay: 1000,
      
      // Network mode optimized
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      networkMode: 'online',
    },
  },
});
