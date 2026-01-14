/**
 * Hook pour surveiller et afficher l'état de connexion
 * Version robuste avec indicateurs clairs
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getConnectionState, 
  connectionRecovery, 
  pingConnection,
  onConnectionChange,
  ConnectionInfo
} from '@/lib/connectionOptimizer';

interface ConnectionStatus {
  isOnline: boolean;
  isStable: boolean;
  isSlow: boolean;
  isRecovering: boolean;
  latency: number;
  lastCheck: number;
  consecutiveFailures: number;
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(() => {
    const state = getConnectionState();
    return {
      isOnline: state.state !== 'offline',
      isStable: state.state === 'online',
      isSlow: state.state === 'slow',
      isRecovering: state.state === 'recovering',
      latency: state.averageLatency,
      lastCheck: state.lastCheck,
      consecutiveFailures: state.consecutiveFailures,
    };
  });
  
  const [isManualRecovering, setIsManualRecovering] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Convertir ConnectionInfo en ConnectionStatus
  const updateFromInfo = useCallback((info: ConnectionInfo) => {
    setStatus({
      isOnline: info.state !== 'offline',
      isStable: info.state === 'online',
      isSlow: info.state === 'slow',
      isRecovering: info.state === 'recovering',
      latency: info.averageLatency,
      lastCheck: info.lastCheck,
      consecutiveFailures: info.consecutiveFailures,
    });
  }, []);

  // Forcer une reconnexion manuelle
  const forceReconnect = useCallback(async () => {
    if (isManualRecovering) return false;
    
    setIsManualRecovering(true);
    try {
      const success = await connectionRecovery.attemptRecovery();
      // Mettre à jour le status après recovery
      updateFromInfo(getConnectionState());
      return success;
    } finally {
      setIsManualRecovering(false);
    }
  }, [isManualRecovering, updateFromInfo]);

  // Rafraîchir manuellement le status
  const refresh = useCallback(async () => {
    const { connected, latency } = await pingConnection();
    updateFromInfo(getConnectionState());
    return connected;
  }, [updateFromInfo]);

  useEffect(() => {
    // S'abonner aux changements d'état de connexion
    unsubscribeRef.current = onConnectionChange(updateFromInfo);

    // Écouter les événements réseau natifs
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true, isRecovering: true }));
    };

    const handleOffline = () => {
      setStatus(prev => ({ 
        ...prev, 
        isOnline: false, 
        isStable: false, 
        isSlow: false,
        isRecovering: false 
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Écouter les changements de recovery
    const unsubscribeRecovery = connectionRecovery.onStateChange((state) => {
      if (state === 'recovered') {
        updateFromInfo(getConnectionState());
      } else if (state === 'recovering') {
        setStatus(prev => ({ ...prev, isRecovering: true }));
      } else if (state === 'failed' || state === 'offline') {
        setStatus(prev => ({ ...prev, isRecovering: false, isOnline: false }));
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeRef.current?.();
      unsubscribeRecovery();
    };
  }, [updateFromInfo]);

  return {
    ...status,
    isManualRecovering,
    forceReconnect,
    refresh,
  };
}

// Type export pour utilisation externe
export type { ConnectionInfo };
