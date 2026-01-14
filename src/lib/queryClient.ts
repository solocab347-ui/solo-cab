/**
 * Configuration React Query OPTIMISÉE pour connexion et latence
 * Cache intelligent + timeout réduits + retry optimisé
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache équilibré pour fraîcheur des données
      staleTime: 5 * 60 * 1000, // 5 minutes (réduit de 10)
      gcTime: 15 * 60 * 1000, // 15 minutes (réduit de 30)
      
      // Refetch sélectif pour données critiques
      refetchOnWindowFocus: false,
      refetchOnMount: 'always', // Activé pour éviter données stales
      refetchOnReconnect: true, // Activé pour récupérer après déconnexion
      
      // Retry optimisé - plus rapide
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(500 * (attemptIndex + 1), 1500),
      
      // Network mode optimisé
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      retryDelay: 500,
      networkMode: 'online',
    },
  },
});
