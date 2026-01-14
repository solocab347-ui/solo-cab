/**
 * Hook pour gérer la synchronisation offline complète
 * Combine le cache de données et la file de mutations
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { offlineMutationQueue, MutationQueueState, MutationType } from '@/lib/offlineMutationQueue';
import { offlineCache } from '@/lib/offlineCache';
import { connectionRecovery, onConnectionChange } from '@/lib/connectionOptimizer';
import { invalidateCriticalQueries } from '@/lib/queryClient';
import { toast } from 'sonner';
import { logger } from '@/lib/productionLogger';

interface OfflineSyncState {
  isOnline: boolean;
  isOfflineMode: boolean;
  isSyncing: boolean;
  pendingMutations: number;
  failedMutations: number;
  lastSync: Date | null;
  cacheStats: {
    clients: number;
    courses: number;
    drivers: number;
  };
}

interface UseOfflineSyncReturn extends OfflineSyncState {
  // Actions
  syncNow: () => Promise<void>;
  addOfflineMutation: (
    type: MutationType,
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: Record<string, any>
  ) => Promise<string>;
  retryFailedMutations: () => Promise<void>;
  clearFailedMutations: () => void;
  clearCache: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const { user, userRole } = useAuth();
  const { isOnline, isStable } = useConnectionStatus();
  
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    isOfflineMode: !navigator.onLine,
    isSyncing: false,
    pendingMutations: 0,
    failedMutations: 0,
    lastSync: null,
    cacheStats: { clients: 0, courses: 0, drivers: 0 },
  });

  // Mettre à jour l'état depuis la queue de mutations
  const updateQueueState = useCallback((queueState: MutationQueueState) => {
    setState(prev => ({
      ...prev,
      pendingMutations: queueState.pending.length,
      failedMutations: queueState.failed.length,
      isSyncing: queueState.syncing,
    }));
  }, []);

  // Charger les stats du cache
  const loadCacheStats = useCallback(async () => {
    const stats = await offlineCache.getStats();
    setState(prev => ({
      ...prev,
      cacheStats: {
        clients: stats.clients,
        courses: stats.courses,
        drivers: stats.drivers,
      },
      lastSync: stats.lastSync ? new Date(stats.lastSync) : null,
    }));
  }, []);

  // Synchronisation complète
  const syncNow = useCallback(async () => {
    if (!user || state.isSyncing) return;

    setState(prev => ({ ...prev, isSyncing: true }));
    logger.info('[OfflineSync] Starting full sync');

    try {
      // 1. Synchroniser les mutations en attente
      const mutationResult = await offlineMutationQueue.syncPendingMutations();
      
      if (mutationResult.success > 0) {
        toast.success(`${mutationResult.success} action(s) synchronisée(s)`);
        // Invalider les queries pour rafraîchir les données
        invalidateCriticalQueries();
      }

      if (mutationResult.failed > 0) {
        toast.error(`${mutationResult.failed} action(s) en échec`);
      }

      // 2. Rafraîchir le cache
      await loadCacheStats();

      // 3. Sauvegarder la date de sync
      const syncTime = new Date();
      await offlineCache.saveMetadata({
        lastSync: syncTime.toISOString(),
        userId: user.id,
        userRole: userRole || 'unknown',
      });

      setState(prev => ({
        ...prev,
        lastSync: syncTime,
        isSyncing: false,
      }));

      logger.info('[OfflineSync] Full sync complete');
    } catch (error) {
      logger.error('[OfflineSync] Sync error', { error });
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [user, userRole, state.isSyncing, loadCacheStats]);

  // Ajouter une mutation offline
  const addOfflineMutation = useCallback(async (
    type: MutationType,
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: Record<string, any>
  ): Promise<string> => {
    const id = await offlineMutationQueue.addMutation(type, table, operation, data);
    
    if (!navigator.onLine) {
      toast.info('Action enregistrée - sera synchronisée au retour de connexion');
    }
    
    return id;
  }, []);

  // Retenter les mutations échouées
  const retryFailedMutations = useCallback(async () => {
    const result = await offlineMutationQueue.retryFailedMutations();
    if (result.success > 0) {
      toast.success(`${result.success} action(s) récupérée(s)`);
      invalidateCriticalQueries();
    }
  }, []);

  // Effacer les mutations échouées
  const clearFailedMutations = useCallback(() => {
    offlineMutationQueue.clearFailedMutations();
    toast.info('Actions échouées supprimées');
  }, []);

  // Vider le cache
  const clearCache = useCallback(async () => {
    await offlineCache.clearAll();
    await loadCacheStats();
    toast.info('Cache vidé');
  }, [loadCacheStats]);

  // Écouter les changements de connexion
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true, isOfflineMode: false }));
      // Sync automatique au retour de connexion
      setTimeout(() => {
        syncNow();
      }, 2000); // Attendre 2s pour que la connexion se stabilise
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false, isOfflineMode: true }));
      toast.warning('Mode hors ligne activé', {
        description: 'Vos actions seront synchronisées au retour de connexion',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Écouter les changements de recovery
    const unsubscribeConnection = connectionRecovery.onStateChange((recoveryState) => {
      if (recoveryState === 'recovered') {
        syncNow();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeConnection();
    };
  }, [syncNow]);

  // S'abonner aux changements de la queue
  useEffect(() => {
    const unsubscribe = offlineMutationQueue.subscribe(updateQueueState);
    // Charger l'état initial
    updateQueueState(offlineMutationQueue.getState());
    return unsubscribe;
  }, [updateQueueState]);

  // Charger les stats au montage
  useEffect(() => {
    loadCacheStats();
  }, [loadCacheStats]);

  // Mettre à jour l'état online
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isOnline,
      isOfflineMode: !isOnline || !isStable,
    }));
  }, [isOnline, isStable]);

  return {
    ...state,
    syncNow,
    addOfflineMutation,
    retryFailedMutations,
    clearFailedMutations,
    clearCache,
  };
}
