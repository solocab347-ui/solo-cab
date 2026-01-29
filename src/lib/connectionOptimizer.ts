/**
 * Optimiseur de connexion robuste et auto-réparateur
 * Solution définitive contre les problèmes de connexion et latence
 * 
 * Utilise désormais la configuration centralisée de networkConfig.ts
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/productionLogger";
import { 
  TIMEOUTS, 
  RETRY, 
  REALTIME,
  calculateRetryDelay as calcDelay,
  isRetryableError 
} from "@/lib/networkConfig";

// Configuration héritée pour compatibilité (utilise les valeurs centralisées)
const CONNECTION_CONFIG = {
  AUTH_TIMEOUT: TIMEOUTS.AUTH,
  QUERY_TIMEOUT: TIMEOUTS.QUERY,
  CRITICAL_QUERY_TIMEOUT: TIMEOUTS.CRITICAL,
  MAX_RETRIES: RETRY.MAX_ATTEMPTS,
  BASE_RETRY_DELAY: RETRY.BASE_DELAY,
  MAX_RETRY_DELAY: RETRY.MAX_DELAY,
  PING_INTERVAL: REALTIME.HEALTH_CHECK_INTERVAL,
  HEALTH_CHECK_TIMEOUT: TIMEOUTS.PING,
  RECOVERY_INTERVAL: 10000,
} as const;

export { CONNECTION_CONFIG };

// États de connexion
type ConnectionState = 'online' | 'offline' | 'slow' | 'recovering';

export interface ConnectionInfo {
  state: ConnectionState;
  lastSuccess: number;
  lastCheck: number;
  consecutiveFailures: number;
  averageLatency: number;
}

let connectionInfo: ConnectionInfo = {
  state: 'online',
  lastSuccess: Date.now(),
  lastCheck: Date.now(),
  consecutiveFailures: 0,
  averageLatency: 0,
};

// Listeners pour changements d'état
const stateListeners: Set<(info: ConnectionInfo) => void> = new Set();

/**
 * Récupère l'état de connexion actuel
 */
export function getConnectionState(): ConnectionInfo {
  return { ...connectionInfo };
}

/**
 * S'abonner aux changements d'état
 */
export function onConnectionChange(callback: (info: ConnectionInfo) => void): () => void {
  stateListeners.add(callback);
  return () => stateListeners.delete(callback);
}

/**
 * Met à jour l'état de connexion
 */
function updateConnectionState(success: boolean, latency?: number) {
  const now = Date.now();
  
  if (success) {
    connectionInfo = {
      state: latency && latency > 3000 ? 'slow' : 'online',
      lastSuccess: now,
      lastCheck: now,
      consecutiveFailures: 0,
      averageLatency: latency 
        ? (connectionInfo.averageLatency * 0.7 + latency * 0.3) 
        : connectionInfo.averageLatency,
    };
  } else {
    connectionInfo.consecutiveFailures++;
    connectionInfo.lastCheck = now;
    
    // Déterminer l'état basé sur les échecs consécutifs
    if (connectionInfo.consecutiveFailures >= 3) {
      connectionInfo.state = 'offline';
    } else if (connectionInfo.consecutiveFailures >= 1) {
      connectionInfo.state = 'recovering';
    }
  }
  
  // Notifier les listeners
  stateListeners.forEach(cb => {
    try {
      cb({ ...connectionInfo });
    } catch (e) {
      logger.error('Connection listener error', { error: e });
    }
  });
}

/**
 * Calcul du délai de retry avec backoff exponentiel + jitter
 */
function calculateRetryDelay(attempt: number): number {
  return calcDelay(attempt);
}

/**
 * Requête optimisée avec retry intelligent et timeout
 */
export async function optimizedQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: {
    timeout?: number;
    retries?: number;
    context?: string;
    critical?: boolean;
  } = {}
): Promise<{ data: T | null; error: any }> {
  const { 
    timeout = options.critical 
      ? CONNECTION_CONFIG.CRITICAL_QUERY_TIMEOUT 
      : CONNECTION_CONFIG.QUERY_TIMEOUT, 
    retries = CONNECTION_CONFIG.MAX_RETRIES,
    context = 'query',
    critical = false,
  } = options;

  let lastError: any = null;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Race entre la requête et le timeout
      const result = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout: ${context} après ${timeout}ms`)), timeout)
        )
      ]);

      // Succès - mettre à jour l'état
      const latency = Date.now() - startTime;
      updateConnectionState(true, latency);
      
      if (result.error) {
        // Erreur métier, pas de retry
        return result;
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Erreurs non-retryables
      const nonRetryableErrors = ['PGRST301', 'JWT', '401', '403', '404'];
      const isNonRetryable = nonRetryableErrors.some(code => 
        error?.code?.includes(code) || 
        error?.message?.includes(code) ||
        error?.status === parseInt(code)
      );
      
      if (isNonRetryable) {
        logger.warn(`Non-retryable error in ${context}`, { error: error?.message });
        return { data: null, error };
      }

      // Si plus de retries disponibles
      if (attempt >= retries) {
        break;
      }

      // Attendre avant le prochain retry
      const delay = calculateRetryDelay(attempt);
      logger.info(`Retry ${attempt + 1}/${retries} for ${context} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Échec final
  updateConnectionState(false);
  logger.error(`Query failed after ${retries} retries: ${context}`, { error: lastError?.message });
  return { data: null, error: lastError };
}

/**
 * Précharge les données critiques pour réduire la latence perçue
 */
export async function prefetchCriticalData(userId: string): Promise<void> {
  if (!userId) return;

  const prefetchPromises = [
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("drivers").select("id, status, is_pioneer, is_fleet_driver, fleet_manager_id, free_access_granted, free_access_end_date, subscription_paid, created_at, stripe_customer_id").eq("user_id", userId).maybeSingle(),
    supabase.from("clients").select("id, is_exclusive, driver_id").eq("user_id", userId).maybeSingle(),
  ];

  try {
    await Promise.allSettled(prefetchPromises);
    updateConnectionState(true);
  } catch {
    // Échec silencieux
  }
}

/**
 * Ping léger pour vérifier la connexion
 */
export async function pingConnection(): Promise<{ connected: boolean; latency: number }> {
  const start = Date.now();
  
  try {
    const { error } = await Promise.race([
      supabase.from("profiles").select("id").limit(1),
      new Promise<{ error: Error }>((resolve) => 
        setTimeout(() => resolve({ error: new Error('Ping timeout') }), CONNECTION_CONFIG.HEALTH_CHECK_TIMEOUT)
      )
    ]);
    
    const latency = Date.now() - start;
    const connected = !error;
    
    updateConnectionState(connected, latency);
    
    return { connected, latency };
  } catch {
    updateConnectionState(false);
    return { connected: false, latency: -1 };
  }
}

/**
 * Gestionnaire de reconnexion automatique robuste
 */
class ConnectionRecovery {
  private isRecovering = false;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 10; // Augmenté pour plus de résilience
  private listeners: Set<(state: string) => void> = new Set();
  private recoveryTimer: NodeJS.Timeout | null = null;

  /**
   * Tente une récupération de connexion
   */
  async attemptRecovery(): Promise<boolean> {
    if (this.isRecovering) {
      return false;
    }

    this.isRecovering = true;
    this.recoveryAttempts++;
    
    this.notifyListeners('recovering');

    try {
      // Étape 1: Vérifier la connectivité réseau
      if (!navigator.onLine) {
        this.notifyListeners('offline');
        this.isRecovering = false;
        // Planifier retry automatique
        this.scheduleRecovery();
        return false;
      }

      // Étape 2: Ping pour vérifier la connexion
      const { connected, latency } = await pingConnection();
      
      if (connected) {
        this.recoveryAttempts = 0;
        this.notifyListeners('recovered');
        this.isRecovering = false;
        return true;
      }

      // Planifier une nouvelle tentative - SANS LIMITE
      this.scheduleRecovery();
      return false;
    } catch (error) {
      this.notifyListeners('recovering');
      this.scheduleRecovery();
      return false;
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Planifie une tentative de récupération - récupération infinie
   */
  private scheduleRecovery() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }

    // Délai progressif mais plafonné à 30s pour toujours réessayer
    const delay = Math.min(CONNECTION_CONFIG.RECOVERY_INTERVAL * Math.min(this.recoveryAttempts, 3), 30000);
    
    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery();
    }, delay);
  }

  /**
   * S'abonner aux changements d'état de recovery
   */
  onStateChange(callback: (state: string) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(state: string) {
    this.listeners.forEach(cb => {
      try {
        cb(state);
      } catch (e) {
        // Silencieux
      }
    });
  }

  /**
   * Réinitialise le compteur de tentatives
   */
  reset() {
    this.recoveryAttempts = 0;
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }
}

export const connectionRecovery = new ConnectionRecovery();

// === Auto-recovery et monitoring ===

// Gestion des événements réseau
if (typeof window !== 'undefined') {
  // Récupération automatique quand le réseau revient
  window.addEventListener('online', () => {
    logger.info('Network online event');
    connectionRecovery.reset();
    setTimeout(() => connectionRecovery.attemptRecovery(), 1000);
  });

  window.addEventListener('offline', () => {
    logger.info('Network offline event');
    updateConnectionState(false);
  });

  // Récupération quand l'app revient en premier plan
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Vérifier la connexion après 500ms (laisser le temps au réseau)
      setTimeout(() => {
        if (connectionInfo.state !== 'online') {
          connectionRecovery.attemptRecovery();
        }
      }, 500);
    }
  });

  // Vérification périodique de la santé de la connexion
  setInterval(() => {
    const timeSinceLastSuccess = Date.now() - connectionInfo.lastSuccess;
    
    // Si plus de 2 minutes sans succès, tenter une récupération
    if (timeSinceLastSuccess > 120000 && connectionInfo.state !== 'recovering') {
      logger.info('Periodic health check triggered recovery');
      connectionRecovery.attemptRecovery();
    }
  }, CONNECTION_CONFIG.PING_INTERVAL);
}
