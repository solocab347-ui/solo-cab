/**
 * Configuration React Query ROBUSTE
 * Optimisée pour connexions variables et récupération d'erreurs
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache généreux pour éviter les requêtes inutiles
      staleTime: 5 * 60 * 1000, // 5 minutes - données considérées fraîches
      gcTime: 30 * 60 * 1000, // 30 minutes - garder en cache
      
      // Refetch intelligent
      refetchOnWindowFocus: false, // Éviter les refetch intempestifs
      refetchOnMount: 'always', // Toujours vérifier au montage
      refetchOnReconnect: true, // Refetch après reconnexion
      
      // Retry robuste avec backoff
      retry: 3,
      retryDelay: (attemptIndex) => {
        // Backoff exponentiel: 1s, 2s, 4s (max)
        return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
      },
      
      // Mode réseau intelligent
      networkMode: 'offlineFirst', // Utiliser le cache si offline
      
      // Timeout implicite géré par connectionOptimizer
    },
    mutations: {
      // Mutations plus strictes
      retry: 2,
      retryDelay: (attemptIndex) => {
        return Math.min(500 * Math.pow(2, attemptIndex), 2000);
      },
      networkMode: 'online', // Mutations requièrent une connexion
    },
  },
});

// Fonction pour invalider le cache après reconnexion
export function invalidateCriticalQueries() {
  // Invalider les données critiques qui peuvent être devenues stales
  queryClient.invalidateQueries({ queryKey: ['user-roles'] });
  queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
  queryClient.invalidateQueries({ queryKey: ['client-profile'] });
  queryClient.invalidateQueries({ queryKey: ['courses'] });
  queryClient.invalidateQueries({ queryKey: ['notifications'] });
}
