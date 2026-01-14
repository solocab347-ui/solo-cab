/**
 * Hook pour surveiller et afficher l'état de connexion
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  getConnectionState, 
  connectionRecovery, 
  pingConnection 
} from '@/lib/connectionOptimizer';

interface ConnectionStatus {
  isOnline: boolean;
  isStable: boolean;
  latency: 'fast' | 'slow' | 'offline';
  lastCheck: number;
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    isStable: true,
    latency: 'fast',
    lastCheck: Date.now(),
  });
  const [isRecovering, setIsRecovering] = useState(false);

  // Mettre à jour le statut
  const updateStatus = useCallback(async () => {
    const state = getConnectionState();
    
    setStatus({
      isOnline: state.state !== 'offline',
      isStable: state.state === 'online',
      latency: state.state === 'online' ? 'fast' : state.state === 'unstable' ? 'slow' : 'offline',
      lastCheck: Date.now(),
    });
  }, []);

  // Forcer une reconnexion
  const forceReconnect = useCallback(async () => {
    setIsRecovering(true);
    try {
      const success = await connectionRecovery.attemptRecovery();
      await updateStatus();
      return success;
    } finally {
      setIsRecovering(false);
    }
  }, [updateStatus]);

  useEffect(() => {
    // Écouter les changements de connexion
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      updateStatus();
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false, isStable: false, latency: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Écouter les changements de recovery
    const unsubscribe = connectionRecovery.onStateChange((state) => {
      if (state === 'recovered') {
        updateStatus();
      }
    });

    // Check initial
    updateStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [updateStatus]);

  return {
    ...status,
    isRecovering,
    forceReconnect,
    refresh: updateStatus,
  };
}
