import { QueryClient, QueryFunction } from '@tanstack/react-query';

/**
 * Configuration optimisée pour React Query
 * Évite les refetch excessifs et améliore la performance
 */

export const optimizedQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Augmenter le stale time pour réduire les refetch
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // Cache plus long
      gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
      
      // Désactiver refetch automatique excessif
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      
      // Retry avec backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Éviter les erreurs silencieuses
      throwOnError: false,
    },
    mutations: {
      // Retry pour les mutations critiques
      retry: 1,
      retryDelay: 1000,
    },
  },
});

/**
 * Helper pour créer des query keys standardisées
 */
export const queryKeys = {
  // Driver queries
  driver: (userId: string) => ['driver', userId] as const,
  driverProfile: (driverId: string) => ['driver-profile', driverId] as const,
  driverClients: (driverId: string) => ['driver-clients', driverId] as const,
  driverCourses: (driverId: string) => ['driver-courses', driverId] as const,
  driverStats: (driverId: string) => ['driver-stats', driverId] as const,
  
  // Client queries
  client: (userId: string) => ['client', userId] as const,
  clientProfile: (clientId: string) => ['client-profile', clientId] as const,
  clientCourses: (clientId: string) => ['client-courses', clientId] as const,
  clientStats: (clientId: string) => ['client-stats', clientId] as const,
  
  // Courses
  courses: () => ['courses'] as const,
  course: (courseId: string) => ['course', courseId] as const,
  
  // Devis
  devis: (devisId: string) => ['devis', devisId] as const,
  devisList: (clientId: string) => ['devis-list', clientId] as const,
  
  // Factures
  facture: (factureId: string) => ['facture', factureId] as const,
  facturesList: (clientId: string) => ['factures-list', clientId] as const,
  
  // Public
  publicDrivers: (location?: string, radius?: number) => 
    ['public-drivers', location, radius] as const,
};

/**
 * Wrapper pour les queries avec logging de performance
 */
export function createOptimizedQuery<TData, TError = Error>(
  queryFn: QueryFunction<TData>,
  queryKey: readonly unknown[],
  label?: string
): QueryFunction<TData> {
  return async (context) => {
    const start = performance.now();
    
    try {
      const result = await queryFn(context);
      const duration = performance.now() - start;
      
      if (duration > 1000) {
        console.warn(`⚠️ Requête lente ${label || queryKey.join('-')}: ${duration.toFixed(0)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`❌ Requête échouée ${label || queryKey.join('-')} après ${duration.toFixed(0)}ms`);
      throw error;
    }
  };
}

/**
 * Invalidate queries de manière optimisée
 */
export async function invalidateQueriesOptimized(
  queryClient: QueryClient,
  queryKeys: readonly unknown[][]
) {
  // Batch les invalidations
  await Promise.all(
    queryKeys.map(key => 
      queryClient.invalidateQueries({ queryKey: key })
    )
  );
}
